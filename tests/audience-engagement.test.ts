import { describe, it, expect, beforeEach } from 'vitest'

// Mock contract state
const mockContract = {
  tickets: new Map(),
  performanceSessions: new Map(),
  audienceFeedback: new Map(),
  engagementMetrics: new Map(),
  nextTicketId: 1,
  nextSessionId: 1
}

// Mock contract functions
function createSession(performanceId, startTime, endTime, maxTickets) {
  if (endTime <= startTime) {
    return { error: 'err-invalid-input' }
  }
  if (maxTickets === 0) {
    return { error: 'err-invalid-input' }
  }
  
  const sessionId = mockContract.nextSessionId
  
  const session = {
    performanceId,
    startTime,
    endTime,
    ticketsSold: 0,
    maxTickets,
    active: true
  }
  
  mockContract.performanceSessions.set(sessionId, session)
  mockContract.nextSessionId++
  
  return { success: sessionId }
}

function purchaseTicket(sessionId, payment) {
  const session = mockContract.performanceSessions.get(sessionId)
  if (!session) {
    return { error: 'err-not-found' }
  }
  if (!session.active) {
    return { error: 'err-invalid-input' }
  }
  if (session.ticketsSold >= session.maxTickets) {
    return { error: 'err-sold-out' }
  }
  if (payment === 0) {
    return { error: 'err-insufficient-funds' }
  }
  
  const ticketId = mockContract.nextTicketId
  const performanceId = session.performanceId
  
  const ticket = {
    performanceId,
    owner: 'ST1BUYER',
    sessionId,
    purchasedAt: Date.now(),
    usedAt: null,
    pricePaid: payment
  }
  
  mockContract.tickets.set(ticketId, ticket)
  
  // Update session
  session.ticketsSold++
  mockContract.performanceSessions.set(sessionId, session)
  
  // Update engagement metrics
  const metrics = mockContract.engagementMetrics.get(performanceId) || {
    totalTicketsSold: 0,
    totalRevenue: 0,
    averageRating: 0,
    totalRatings: 0
  }
  
  metrics.totalTicketsSold++
  metrics.totalRevenue += payment
  mockContract.engagementMetrics.set(performanceId, metrics)
  
  mockContract.nextTicketId++
  return { success: ticketId }
}

function useTicket(ticketId, caller) {
  const ticket = mockContract.tickets.get(ticketId)
  if (!ticket) {
    return { error: 'err-not-found' }
  }
  if (ticket.owner !== caller) {
    return { error: 'err-unauthorized' }
  }
  if (ticket.usedAt !== null) {
    return { error: 'err-invalid-input' }
  }
  
  ticket.usedAt = Date.now()
  mockContract.tickets.set(ticketId, ticket)
  
  return { success: true }
}

function submitFeedback(ticketId, rating, comment, caller) {
  const ticket = mockContract.tickets.get(ticketId)
  if (!ticket) {
    return { error: 'err-not-found' }
  }
  if (ticket.owner !== caller) {
    return { error: 'err-unauthorized' }
  }
  if (ticket.usedAt === null) {
    return { error: 'err-invalid-input' }
  }
  if (rating < 1 || rating > 5) {
    return { error: 'err-invalid-input' }
  }
  
  const feedback = {
    rating,
    comment,
    submittedAt: Date.now()
  }
  
  mockContract.audienceFeedback.set(ticketId, feedback)
  
  // Update average rating
  const performanceId = ticket.performanceId
  const metrics = mockContract.engagementMetrics.get(performanceId)
  if (metrics) {
    const totalRatings = metrics.totalRatings
    const currentAverage = metrics.averageRating
    const newTotalRatings = totalRatings + 1
    const newAverage = Math.floor((currentAverage * totalRatings + rating) / newTotalRatings)
    
    metrics.averageRating = newAverage
    metrics.totalRatings = newTotalRatings
    mockContract.engagementMetrics.set(performanceId, metrics)
  }
  
  return { success: true }
}

function getTicket(ticketId) {
  return mockContract.tickets.get(ticketId) || null
}

function getSession(sessionId) {
  return mockContract.performanceSessions.get(sessionId) || null
}

function getFeedback(ticketId) {
  return mockContract.audienceFeedback.get(ticketId) || null
}

function getEngagementMetrics(performanceId) {
  return mockContract.engagementMetrics.get(performanceId) || null
}

function getAvailableTickets(sessionId) {
  const session = mockContract.performanceSessions.get(sessionId)
  return session ? session.maxTickets - session.ticketsSold : 0
}

describe('Audience Engagement Contract', () => {
  beforeEach(() => {
    // Reset mock contract state
    mockContract.tickets.clear()
    mockContract.performanceSessions.clear()
    mockContract.audienceFeedback.clear()
    mockContract.engagementMetrics.clear()
    mockContract.nextTicketId = 1
    mockContract.nextSessionId = 1
  })
  
  describe('Session Management', () => {
    it('should create session successfully', () => {
      const result = createSession(1, 1000, 2000, 50)
      
      expect(result.success).toBe(1)
      
      const session = getSession(1)
      expect(session).toBeTruthy()
      expect(session.performanceId).toBe(1)
      expect(session.startTime).toBe(1000)
      expect(session.endTime).toBe(2000)
      expect(session.maxTickets).toBe(50)
      expect(session.ticketsSold).toBe(0)
      expect(session.active).toBe(true)
    })
    
    it('should fail to create session with invalid time range', () => {
      const result = createSession(1, 2000, 1000, 50)
      
      expect(result.error).toBe('err-invalid-input')
    })
    
    it('should fail to create session with zero max tickets', () => {
      const result = createSession(1, 1000, 2000, 0)
      
      expect(result.error).toBe('err-invalid-input')
    })
  })
  
  describe('Ticket Purchase', () => {
    beforeEach(() => {
      createSession(1, 1000, 2000, 2) // Only 2 tickets available
    })
    
    it('should purchase ticket successfully', () => {
      const result = purchaseTicket(1, 100)
      
      expect(result.success).toBe(1)
      
      const ticket = getTicket(1)
      expect(ticket).toBeTruthy()
      expect(ticket.performanceId).toBe(1)
      expect(ticket.sessionId).toBe(1)
      expect(ticket.pricePaid).toBe(100)
      expect(ticket.usedAt).toBeNull()
      
      const session = getSession(1)
      expect(session.ticketsSold).toBe(1)
      
      const metrics = getEngagementMetrics(1)
      expect(metrics.totalTicketsSold).toBe(1)
      expect(metrics.totalRevenue).toBe(100)
    })
    
    it('should fail to purchase ticket for non-existent session', () => {
      const result = purchaseTicket(999, 100)
      
      expect(result.error).toBe('err-not-found')
    })
    
    it('should fail to purchase ticket with zero payment', () => {
      const result = purchaseTicket(1, 0)
      
      expect(result.error).toBe('err-insufficient-funds')
    })
    
    it('should fail to purchase ticket when sold out', () => {
      purchaseTicket(1, 100)
      purchaseTicket(1, 100)
      const result = purchaseTicket(1, 100) // Third ticket should fail
      
      expect(result.error).toBe('err-sold-out')
    })
    
    it('should track available tickets correctly', () => {
      expect(getAvailableTickets(1)).toBe(2)
      
      purchaseTicket(1, 100)
      expect(getAvailableTickets(1)).toBe(1)
      
      purchaseTicket(1, 100)
      expect(getAvailableTickets(1)).toBe(0)
    })
  })
  
  describe('Ticket Usage', () => {
    beforeEach(() => {
      createSession(1, 1000, 2000, 50)
      purchaseTicket(1, 100)
    })
    
    it('should use ticket successfully', () => {
      const result = useTicket(1, 'ST1BUYER')
      
      expect(result.success).toBe(true)
      
      const ticket = getTicket(1)
      expect(ticket.usedAt).not.toBeNull()
    })
    
    it('should fail to use non-existent ticket', () => {
      const result = useTicket(999, 'ST1BUYER')
      
      expect(result.error).toBe('err-not-found')
    })
    
    it('should fail to use ticket by non-owner', () => {
      const result = useTicket(1, 'ST1NOTOWNER')
      
      expect(result.error).toBe('err-unauthorized')
    })
    
    it('should fail to use already used ticket', () => {
      useTicket(1, 'ST1BUYER')
      const result = useTicket(1, 'ST1BUYER')
      
      expect(result.error).toBe('err-invalid-input')
    })
  })
  
  describe('Feedback System', () => {
    beforeEach(() => {
      createSession(1, 1000, 2000, 50)
      purchaseTicket(1, 100)
      useTicket(1, 'ST1BUYER')
    })
    
    it('should submit feedback successfully', () => {
      const result = submitFeedback(1, 5, 'Amazing performance!', 'ST1BUYER')
      
      expect(result.success).toBe(true)
      
      const feedback = getFeedback(1)
      expect(feedback).toBeTruthy()
      expect(feedback.rating).toBe(5)
      expect(feedback.comment).toBe('Amazing performance!')
      
      const metrics = getEngagementMetrics(1)
      expect(metrics.averageRating).toBe(5)
      expect(metrics.totalRatings).toBe(1)
    })
    
    it('should fail to submit feedback for non-existent ticket', () => {
      const result = submitFeedback(999, 5, 'Comment', 'ST1BUYER')
      
      expect(result.error).toBe('err-not-found')
    })
    
    it('should fail to submit feedback by non-owner', () => {
      const result = submitFeedback(1, 5, 'Comment', 'ST1NOTOWNER')
      
      expect(result.error).toBe('err-unauthorized')
    })
    
    it('should fail to submit feedback for unused ticket', () => {
      createSession(2, 1000, 2000, 50)
      purchaseTicket(2, 100) // Ticket 2, not used
      
      const result = submitFeedback(2, 5, 'Comment', 'ST1BUYER')
      
      expect(result.error).toBe('err-invalid-input')
    })
    
    it('should fail to submit feedback with invalid rating', () => {
      const result1 = submitFeedback(1, 0, 'Comment', 'ST1BUYER')
      const result2 = submitFeedback(1, 6, 'Comment', 'ST1BUYER')
      
      expect(result1.error).toBe('err-invalid-input')
      expect(result2.error).toBe('err-invalid-input')
    })
    
    it('should calculate average rating correctly', () => {
      // Submit first feedback
      submitFeedback(1, 5, 'Great!', 'ST1BUYER')
      
      // Create and use second ticket
      purchaseTicket(1, 100) // Ticket 2
      useTicket(2, 'ST1BUYER')
      submitFeedback(2, 3, 'Okay', 'ST1BUYER')
      
      const metrics = getEngagementMetrics(1)
      expect(metrics.averageRating).toBe(4) // (5 + 3) / 2 = 4
      expect(metrics.totalRatings).toBe(2)
    })
  })
  
  describe('Read-only Functions', () => {
    beforeEach(() => {
      createSession(1, 1000, 2000, 50)
      purchaseTicket(1, 100)
    })
    
    it('should get ticket details', () => {
      const ticket = getTicket(1)
      
      expect(ticket).toBeTruthy()
      expect(ticket.performanceId).toBe(1)
      expect(ticket.pricePaid).toBe(100)
    })
    
    it('should get session details', () => {
      const session = getSession(1)
      
      expect(session).toBeTruthy()
      expect(session.performanceId).toBe(1)
      expect(session.ticketsSold).toBe(1)
    })
    
    it('should return null for non-existent entities', () => {
      expect(getTicket(999)).toBeNull()
      expect(getSession(999)).toBeNull()
      expect(getFeedback(999)).toBeNull()
      expect(getEngagementMetrics(999)).toBeNull()
    })
  })
})
