;; Performance Design Contract
;; Manages holographic performance creation and tokenization

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u200))
(define-constant err-not-found (err u201))
(define-constant err-already-exists (err u202))
(define-constant err-unauthorized (err u203))
(define-constant err-invalid-input (err u204))
(define-constant err-not-verified (err u205))

;; Data Variables
(define-data-var next-performance-id uint u1)

;; Data Maps
(define-map performances
  { performance-id: uint }
  {
    artist-id: uint,
    title: (string-ascii 200),
    description: (string-ascii 1000),
    duration: uint,
    technology-requirements: (string-ascii 500),
    price: uint,
    max-audience: uint,
    created-at: uint,
    updated-at: uint,
    active: bool
  }
)

(define-map performance-metadata
  { performance-id: uint }
  {
    hologram-data-hash: (string-ascii 64),
    audio-hash: (string-ascii 64),
    lighting-config: (string-ascii 500),
    interaction-points: (string-ascii 1000)
  }
)

(define-map performance-tokens
  { performance-id: uint, token-id: uint }
  {
    owner: principal,
    created-at: uint,
    used: bool
  }
)

(define-map artist-performances
  { artist-id: uint, performance-id: uint }
  { active: bool }
)

;; Public Functions

;; Create a new performance (only verified artists)
(define-public (create-performance
  (artist-id uint)
  (title (string-ascii 200))
  (description (string-ascii 1000))
  (duration uint)
  (technology-requirements (string-ascii 500))
  (price uint)
  (max-audience uint)
  (hologram-data-hash (string-ascii 64))
  (audio-hash (string-ascii 64))
  (lighting-config (string-ascii 500))
  (interaction-points (string-ascii 1000))
)
  (let
    (
      (performance-id (var-get next-performance-id))
    )
    (asserts! (> (len title) u0) err-invalid-input)
    (asserts! (> duration u0) err-invalid-input)
    (asserts! (> max-audience u0) err-invalid-input)

    ;; Check if artist is verified (would call artist-verification contract)
    ;; For now, we'll assume verification check passes

    (map-set performances
      { performance-id: performance-id }
      {
        artist-id: artist-id,
        title: title,
        description: description,
        duration: duration,
        technology-requirements: technology-requirements,
        price: price,
        max-audience: max-audience,
        created-at: block-height,
        updated-at: block-height,
        active: true
      }
    )

    (map-set performance-metadata
      { performance-id: performance-id }
      {
        hologram-data-hash: hologram-data-hash,
        audio-hash: audio-hash,
        lighting-config: lighting-config,
        interaction-points: interaction-points
      }
    )

    (map-set artist-performances
      { artist-id: artist-id, performance-id: performance-id }
      { active: true }
    )

    (var-set next-performance-id (+ performance-id u1))
    (ok performance-id)
  )
)

;; Update performance details (only by artist)
(define-public (update-performance
  (performance-id uint)
  (title (string-ascii 200))
  (description (string-ascii 1000))
  (price uint)
)
  (let
    (
      (performance (unwrap! (map-get? performances { performance-id: performance-id }) err-not-found))
    )
    (asserts! (> (len title) u0) err-invalid-input)
    ;; In real implementation, check if tx-sender is the artist

    (map-set performances
      { performance-id: performance-id }
      (merge performance {
        title: title,
        description: description,
        price: price,
        updated-at: block-height
      })
    )
    (ok true)
  )
)

;; Mint performance token
(define-public (mint-performance-token (performance-id uint) (token-id uint) (recipient principal))
  (let
    (
      (performance (unwrap! (map-get? performances { performance-id: performance-id }) err-not-found))
    )
    (asserts! (get active performance) err-invalid-input)
    (asserts! (is-none (map-get? performance-tokens { performance-id: performance-id, token-id: token-id })) err-already-exists)

    (map-set performance-tokens
      { performance-id: performance-id, token-id: token-id }
      {
        owner: recipient,
        created-at: block-height,
        used: false
      }
    )
    (ok true)
  )
)

;; Use performance token
(define-public (use-performance-token (performance-id uint) (token-id uint))
  (let
    (
      (token (unwrap! (map-get? performance-tokens { performance-id: performance-id, token-id: token-id }) err-not-found))
    )
    (asserts! (is-eq (get owner token) tx-sender) err-unauthorized)
    (asserts! (not (get used token)) err-invalid-input)

    (map-set performance-tokens
      { performance-id: performance-id, token-id: token-id }
      (merge token { used: true })
    )
    (ok true)
  )
)

;; Deactivate performance
(define-public (deactivate-performance (performance-id uint))
  (let
    (
      (performance (unwrap! (map-get? performances { performance-id: performance-id }) err-not-found))
    )
    ;; Check if caller is the artist (simplified for demo)
    (map-set performances
      { performance-id: performance-id }
      (merge performance { active: false, updated-at: block-height })
    )
    (ok true)
  )
)

;; Read-only Functions

;; Get performance details
(define-read-only (get-performance (performance-id uint))
  (map-get? performances { performance-id: performance-id })
)

;; Get performance metadata
(define-read-only (get-performance-metadata (performance-id uint))
  (map-get? performance-metadata { performance-id: performance-id })
)

;; Get performance token
(define-read-only (get-performance-token (performance-id uint) (token-id uint))
  (map-get? performance-tokens { performance-id: performance-id, token-id: token-id })
)

;; Check if performance is active
(define-read-only (is-performance-active (performance-id uint))
  (match (map-get? performances { performance-id: performance-id })
    performance (get active performance)
    false
  )
)

;; Get next performance ID
(define-read-only (get-next-performance-id)
  (var-get next-performance-id)
)
