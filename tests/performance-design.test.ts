import { describe, it, expect, beforeEach } from 'vitest'

// Mock contract state
const mockContract = {
  performances: new Map(),
  performanceMetadata: new Map(),
  performanceTokens: new Map(),
  artistPerformances: new Map(),
  nextPerformanceId: 1
}

// Mock contract functions
function createPerformance(
    artistId,
    title,
    description,
    duration,
    technologyRequirements,
    price,
    maxAudience,
    hologramDataHash,
    audioHash,
    lightingConfig,
    interactionPoints
) {
  if (!title || title.length === 0) {
    return { error: 'err-invalid-input' }
  }
  if (duration === 0) {
    return { error: 'err-invalid-input' }
  }
  if (maxAudience === 0) {
    return { error: 'err-invalid-input' }
  }
  
  const performanceId = mockContract.nextPerformanceId
  
  const performance = {
    artistId,
    title,
    description,
    duration,
    technologyRequirements,
    price,
    maxAudience,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    active: true
  }
  
  const metadata = {
    hologramDataHash,
    audioHash,
    lightingConfig,
    interactionPoints
  }
  
  mockContract.performances.set(performanceId, performance)
  mockContract.performanceMetadata.set(performanceId, metadata)
  mockContract.artistPerformances.set(`${artistId}-${performanceId}`, { active: true })
  mockContract.nextPerformanceId++
  
  return { success: performanceId }
}

function updatePerformance(performanceId, title, description, price) {
  if (!title || title.length === 0) {
    return { error: 'err-invalid-input' }
  }
  
  const performance = mockContract.performances.get(performanceId)
  if (!performance) {
    return { error: 'err-not-found' }
  }
  
  performance.title = title
  performance.description = description
  performance.price = price
  performance.updatedAt = Date.now()
  
  mockContract.performances.set(performanceId, performance)
  return { success: true }
}

function mintPerformanceToken(performanceId, tokenId, recipient) {
  const performance = mockContract.performances.get(performanceId)
  if (!performance) {
    return { error: 'err-not-found' }
  }
  if (!performance.active) {
    return { error: 'err-invalid-input' }
  }
  
  const tokenKey = `${performanceId}-${tokenId}`
  if (mockContract.performanceTokens.has(tokenKey)) {
    return { error: 'err-already-exists' }
  }
  
  const token = {
    owner: recipient,
    createdAt: Date.now(),
    used: false
  }
  
  mockContract.performanceTokens.set(tokenKey, token)
  return { success: true }
}

function usePerformanceToken(performanceId, tokenId, caller) {
  const tokenKey = `${performanceId}-${tokenId}`
  const token = mockContract.performanceTokens.get(tokenKey)
  
  if (!token) {
    return { error: 'err-not-found' }
  }
  if (token.owner !== caller) {
    return { error: 'err-unauthorized' }
  }
  if (token.used) {
    return { error: 'err-invalid-input' }
  }
  
  token.used = true
  mockContract.performanceTokens.set(tokenKey, token)
  return { success: true }
}

function getPerformance(performanceId) {
  return mockContract.performances.get(performanceId) || null
}

function getPerformanceMetadata(performanceId) {
  return mockContract.performanceMetadata.get(performanceId) || null
}

function getPerformanceToken(performanceId, tokenId) {
  const tokenKey = `${performanceId}-${tokenId}`
  return mockContract.performanceTokens.get(tokenKey) || null
}

function isPerformanceActive(performanceId) {
  const performance = mockContract.performances.get(performanceId)
  return performance ? performance.active : false
}

describe('Performance Design Contract', () => {
  beforeEach(() => {
    // Reset mock contract state
    mockContract.performances.clear()
    mockContract.performanceMetadata.clear()
    mockContract.performanceTokens.clear()
    mockContract.artistPerformances.clear()
    mockContract.nextPerformanceId = 1
  })
  
  describe('Performance Creation', () => {
    it('should create a new performance successfully', () => {
      const result = createPerformance(
          1,
          'Holographic Symphony',
          'A mesmerizing holographic performance combining classical music with digital art',
          3600, // 1 hour
          'High-resolution holographic projectors, surround sound system',
          100,
          50,
          'abc123hash',
          'def456hash',
          'RGB lighting with dynamic patterns',
          'Audience can interact at specific moments'
      )
      
      expect(result.success).toBe(1)
      
      const performance = getPerformance(1)
      expect(performance).toBeTruthy()
      expect(performance.title).toBe('Holographic Symphony')
      expect(performance.artistId).toBe(1)
      expect(performance.duration).toBe(3600)
      expect(performance.active).toBe(true)
      
      const metadata = getPerformanceMetadata(1)
      expect(metadata).toBeTruthy()
      expect(metadata.hologramDataHash).toBe('abc123hash')
      expect(metadata.audioHash).toBe('def456hash')
    })
    
    it('should fail to create performance with empty title', () => {
      const result = createPerformance(
          1, '', 'Description', 3600, 'Tech requirements', 100, 50,
          'hash1', 'hash2', 'lighting', 'interactions'
      )
      
      expect(result.error).toBe('err-invalid-input')
    })
    
    it('should fail to create performance with zero duration', () => {
      const result = createPerformance(
          1, 'Title', 'Description', 0, 'Tech requirements', 100, 50,
          'hash1', 'hash2', 'lighting', 'interactions'
      )
      
      expect(result.error).toBe('err-invalid-input')
    })
    
    it('should fail to create performance with zero max audience', () => {
      const result = createPerformance(
          1, 'Title', 'Description', 3600, 'Tech requirements', 100, 0,
          'hash1', 'hash2', 'lighting', 'interactions'
      )
      
      expect(result.error).toBe('err-invalid-input')
    })
  })
  
  describe('Performance Updates', () => {
    beforeEach(() => {
      createPerformance(
          1, 'Original Title', 'Original Description', 3600, 'Tech', 100, 50,
          'hash1', 'hash2', 'lighting', 'interactions'
      )
    })
    
    it('should update performance successfully', () => {
      const result = updatePerformance(1, 'Updated Title', 'Updated Description', 150)
      
      expect(result.success).toBe(true)
      
      const performance = getPerformance(1)
      expect(performance.title).toBe('Updated Title')
      expect(performance.description).toBe('Updated Description')
      expect(performance.price).toBe(150)
    })
    
    it('should fail to update non-existent performance', () => {
      const result = updatePerformance(999, 'Title', 'Description', 100)
      
      expect(result.error).toBe('err-not-found')
    })
    
    it('should fail to update performance with empty title', () => {
      const result = updatePerformance(1, '', 'Description', 100)
      
      expect(result.error).toBe('err-invalid-input')
    })
  })
  
  describe('Performance Token Management', () => {
    beforeEach(() => {
      createPerformance(
          1, 'Test Performance', 'Description', 3600, 'Tech', 100, 50,
          'hash1', 'hash2', 'lighting', 'interactions'
      )
    })
    
    it('should mint performance token successfully', () => {
      const result = mintPerformanceToken(1, 1, 'ST1RECIPIENT')
      
      expect(result.success).toBe(true)
      
      const token = getPerformanceToken(1, 1)
      expect(token).toBeTruthy()
      expect(token.owner).toBe('ST1RECIPIENT')
      expect(token.used).toBe(false)
    })
    
    it('should fail to mint token for non-existent performance', () => {
      const result = mintPerformanceToken(999, 1, 'ST1RECIPIENT')
      
      expect(result.error).toBe('err-not-found')
    })
    
    it('should fail to mint duplicate token', () => {
      mintPerformanceToken(1, 1, 'ST1RECIPIENT')
      const result = mintPerformanceToken(1, 1, 'ST1ANOTHER')
      
      expect(result.error).toBe('err-already-exists')
    })
    
    it('should use performance token successfully', () => {
      mintPerformanceToken(1, 1, 'ST1OWNER')
      const result = usePerformanceToken(1, 1, 'ST1OWNER')
      
      expect(result.success).toBe(true)
      
      const token = getPerformanceToken(1, 1)
      expect(token.used).toBe(true)
    })
    
    it('should fail to use token by non-owner', () => {
      mintPerformanceToken(1, 1, 'ST1OWNER')
      const result = usePerformanceToken(1, 1, 'ST1NOTOWNER')
      
      expect(result.error).toBe('err-unauthorized')
    })
    
    it('should fail to use already used token', () => {
      mintPerformanceToken(1, 1, 'ST1OWNER')
      usePerformanceToken(1, 1, 'ST1OWNER')
      const result = usePerformanceToken(1, 1, 'ST1OWNER')
      
      expect(result.error).toBe('err-invalid-input')
    })
  })
  
  describe('Read-only Functions', () => {
    beforeEach(() => {
      createPerformance(
          1, 'Test Performance', 'Description', 3600, 'Tech', 100, 50,
          'hash1', 'hash2', 'lighting', 'interactions'
      )
    })
    
    it('should get performance details', () => {
      const performance = getPerformance(1)
      
      expect(performance).toBeTruthy()
      expect(performance.title).toBe('Test Performance')
      expect(performance.artistId).toBe(1)
    })
    
    it('should get performance metadata', () => {
      const metadata = getPerformanceMetadata(1)
      
      expect(metadata).toBeTruthy()
      expect(metadata.hologramDataHash).toBe('hash1')
      expect(metadata.audioHash).toBe('hash2')
    })
    
    it('should check if performance is active', () => {
      expect(isPerformanceActive(1)).toBe(true)
      expect(isPerformanceActive(999)).toBe(false)
    })
    
    it('should return null for non-existent performance', () => {
      const performance = getPerformance(999)
      
      expect(performance).toBeNull()
    })
  })
})
