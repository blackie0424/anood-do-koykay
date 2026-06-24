/**
 * NetworkOptimizer - 網路環境偵測工具（純函式）
 *
 * 只負責讀取裝置網路狀態並計算最佳設定。
 * 無副作用：不含事件綁定、定時器、快取或音頻載入邏輯。
 *
 * 互動職責（佇列、快取、監聽、音頻載入）已移至 AudioNetworkService。
 */

class NetworkOptimizer {
  constructor() {
    this.connectionInfo = this.getConnectionInfo()
    this.adaptiveSettings = this.calculateAdaptiveSettings()
  }

  /**
   * 獲取連線資訊
   * @returns {object}
   */
  getConnectionInfo() {
    const info = {
      isOnline: navigator.onLine,
      effectiveType: '4g',
      downlink: 10,
      rtt: 100,
      saveData: false,
      isSlowConnection: false,
      estimatedBandwidth: 10000, // kbps
    }

    if (navigator.connection) {
      const conn = navigator.connection
      info.effectiveType = conn.effectiveType || '4g'
      info.downlink = conn.downlink || 10
      info.rtt = conn.rtt || 100
      info.saveData = conn.saveData || false

      // 計算估計頻寬 (kbps)
      info.estimatedBandwidth = (conn.downlink || 10) * 1000

      // 判斷是否為慢速連線
      info.isSlowConnection =
        conn.effectiveType === 'slow-2g' ||
        conn.effectiveType === '2g' ||
        conn.downlink < 1.5 ||
        conn.saveData
    }

    return info
  }

  /**
   * 計算自適應設定
   * @returns {object}
   */
  calculateAdaptiveSettings() {
    const conn = this.connectionInfo

    const settings = {
      maxConcurrentLoads: 3,
      preloadStrategy: 'metadata',
      compressionLevel: 'medium',
      timeoutMultiplier: 1,
      retryStrategy: 'exponential',
      cacheStrategy: 'aggressive',
      progressiveLoading: false,
    }

    if (conn.isSlowConnection) {
      // 慢速網路設定
      settings.maxConcurrentLoads = 1
      settings.preloadStrategy = 'none'
      settings.compressionLevel = 'high'
      settings.timeoutMultiplier = 3
      settings.retryStrategy = 'linear'
      settings.cacheStrategy = 'conservative'
      settings.progressiveLoading = true
    } else if (conn.effectiveType === '3g') {
      // 中速網路設定
      settings.maxConcurrentLoads = 2
      settings.preloadStrategy = 'metadata'
      settings.compressionLevel = 'medium'
      settings.timeoutMultiplier = 2
      settings.retryStrategy = 'exponential'
      settings.cacheStrategy = 'moderate'
      settings.progressiveLoading = false
    } else {
      // 快速網路設定
      settings.maxConcurrentLoads = 4
      settings.preloadStrategy = 'auto'
      settings.compressionLevel = 'low'
      settings.timeoutMultiplier = 1
      settings.retryStrategy = 'exponential'
      settings.cacheStrategy = 'aggressive'
      settings.progressiveLoading = false
    }

    return settings
  }

  /**
   * 重新讀取網路狀態並更新設定
   */
  refresh() {
    this.connectionInfo = this.getConnectionInfo()
    this.adaptiveSettings = this.calculateAdaptiveSettings()
  }
}

// 建立全域單例；互動職責（監聽、佇列、音頻載入）由 AudioNetworkService 承擔
const networkOptimizer = new NetworkOptimizer()

export default networkOptimizer
