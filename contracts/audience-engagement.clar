;; Audience Engagement Contract
;; Handles audience interaction and ticket management

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u300))
(define-constant err-not-found (err u301))
(define-constant err-already-exists (err u302))
(define-constant err-unauthorized (err u303))
(define-constant err-invalid-input (err u304))
(define-constant err-insufficient-funds (err u305))
(define-constant err-sold-out (err u306))

;; Data Variables
(define-data-var next-ticket-id uint u1)
(define-data-var next-session-id uint u1)

;; Data Maps
(define-map tickets
  { ticket-id: uint }
  {
    performance-id: uint,
    owner: principal,
    session-id: uint,
    purchased-at: uint,
    used-at: (optional uint),
    price-paid: uint
  }
)

(define-map performance-sessions
  { session-id: uint }
  {
    performance-id: uint,
    start-time: uint,
    end-time: uint,
    tickets-sold: uint,
    max-tickets: uint,
    active: bool
  }
)

(define-map audience-feedback
  { ticket-id: uint }
  {
    rating: uint,
    comment: (string-ascii 500),
    submitted-at: uint
  }
)

(define-map engagement-metrics
  { performance-id: uint }
  {
    total-tickets-sold: uint,
    total-revenue: uint,
    average-rating: uint,
    total-ratings: uint
  }
)

;; Public Functions

;; Create a performance session
(define-public (create-session
  (performance-id uint)
  (start-time uint)
  (end-time uint)
  (max-tickets uint)
)
  (let
    (
      (session-id (var-get next-session-id))
    )
    (asserts! (> end-time start-time) err-invalid-input)
    (asserts! (> max-tickets u0) err-invalid-input)

    (map-set performance-sessions
      { session-id: session-id }
      {
        performance-id: performance-id,
        start-time: start-time,
        end-time: end-time,
        tickets-sold: u0,
        max-tickets: max-tickets,
        active: true
      }
    )

    (var-set next-session-id (+ session-id u1))
    (ok session-id)
  )
)

;; Purchase ticket
(define-public (purchase-ticket (session-id uint) (payment uint))
  (let
    (
      (session (unwrap! (map-get? performance-sessions { session-id: session-id }) err-not-found))
      (ticket-id (var-get next-ticket-id))
      (performance-id (get performance-id session))
    )
    (asserts! (get active session) err-invalid-input)
    (asserts! (< (get tickets-sold session) (get max-tickets session)) err-sold-out)
    (asserts! (> payment u0) err-insufficient-funds)

    ;; Create ticket
    (map-set tickets
      { ticket-id: ticket-id }
      {
        performance-id: performance-id,
        owner: tx-sender,
        session-id: session-id,
        purchased-at: block-height,
        used-at: none,
        price-paid: payment
      }
    )

    ;; Update session
    (map-set performance-sessions
      { session-id: session-id }
      (merge session { tickets-sold: (+ (get tickets-sold session) u1) })
    )

    ;; Update engagement metrics
    (let
      (
        (metrics (default-to
          { total-tickets-sold: u0, total-revenue: u0, average-rating: u0, total-ratings: u0 }
          (map-get? engagement-metrics { performance-id: performance-id })
        ))
      )
      (map-set engagement-metrics
        { performance-id: performance-id }
        (merge metrics {
          total-tickets-sold: (+ (get total-tickets-sold metrics) u1),
          total-revenue: (+ (get total-revenue metrics) payment)
        })
      )
    )

    (var-set next-ticket-id (+ ticket-id u1))
    (ok ticket-id)
  )
)

;; Use ticket for performance
(define-public (use-ticket (ticket-id uint))
  (let
    (
      (ticket (unwrap! (map-get? tickets { ticket-id: ticket-id }) err-not-found))
    )
    (asserts! (is-eq (get owner ticket) tx-sender) err-unauthorized)
    (asserts! (is-none (get used-at ticket)) err-invalid-input)

    (map-set tickets
      { ticket-id: ticket-id }
      (merge ticket { used-at: (some block-height) })
    )
    (ok true)
  )
)

;; Submit feedback
(define-public (submit-feedback
  (ticket-id uint)
  (rating uint)
  (comment (string-ascii 500))
)
  (let
    (
      (ticket (unwrap! (map-get? tickets { ticket-id: ticket-id }) err-not-found))
      (performance-id (get performance-id ticket))
    )
    (asserts! (is-eq (get owner ticket) tx-sender) err-unauthorized)
    (asserts! (is-some (get used-at ticket)) err-invalid-input)
    (asserts! (and (>= rating u1) (<= rating u5)) err-invalid-input)

    (map-set audience-feedback
      { ticket-id: ticket-id }
      {
        rating: rating,
        comment: comment,
        submitted-at: block-height
      }
    )

    ;; Update average rating
    (let
      (
        (metrics (unwrap! (map-get? engagement-metrics { performance-id: performance-id }) err-not-found))
        (total-ratings (get total-ratings metrics))
        (current-average (get average-rating metrics))
        (new-total-ratings (+ total-ratings u1))
        (new-average (/ (+ (* current-average total-ratings) rating) new-total-ratings))
      )
      (map-set engagement-metrics
        { performance-id: performance-id }
        (merge metrics {
          average-rating: new-average,
          total-ratings: new-total-ratings
        })
      )
    )

    (ok true)
  )
)

;; Cancel session
(define-public (cancel-session (session-id uint))
  (let
    (
      (session (unwrap! (map-get? performance-sessions { session-id: session-id }) err-not-found))
    )
    ;; Check authorization (simplified)
    (map-set performance-sessions
      { session-id: session-id }
      (merge session { active: false })
    )
    (ok true)
  )
)

;; Read-only Functions

;; Get ticket details
(define-read-only (get-ticket (ticket-id uint))
  (map-get? tickets { ticket-id: ticket-id })
)

;; Get session details
(define-read-only (get-session (session-id uint))
  (map-get? performance-sessions { session-id: session-id })
)

;; Get feedback
(define-read-only (get-feedback (ticket-id uint))
  (map-get? audience-feedback { ticket-id: ticket-id })
)

;; Get engagement metrics
(define-read-only (get-engagement-metrics (performance-id uint))
  (map-get? engagement-metrics { performance-id: performance-id })
)

;; Check ticket availability
(define-read-only (get-available-tickets (session-id uint))
  (match (map-get? performance-sessions { session-id: session-id })
    session (- (get max-tickets session) (get tickets-sold session))
    u0
  )
)

;; Get next ticket ID
(define-read-only (get-next-ticket-id)
  (var-get next-ticket-id)
)

;; Get next session ID
(define-read-only (get-next-session-id)
  (var-get next-session-id)
)
