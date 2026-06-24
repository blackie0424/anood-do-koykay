/**
 * PerformanceMonitor - 音頻播放性能監控工具
 *
 * 監控音頻播放性能指標，提供優化建議
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map()
    this.thresholds = {
      loadTime: 2000, // 2秒載入時間閾值
      playDelay: 500, // 500ms 播放延遲閾值
      errorRate: 0.1, // 10% 錯誤率閾值
    }

    this.isEnabled = true
    this.maxMetricsCount = 100 // 最多保存100條記錄
  }

  /**
   * 開始監控音頻播放
   * @param {string} audioId - 音頻ID
   * @param {string} audioUrl - 音頻URL
   * @returns {object} 監控會話
   */
  startMonitoring(audioId, audioUrl) {
    if (!this.isEnabled) return null

    const session = {
      audioId,
      audioUrl,
      startTime: performance.now(),
      loadStartTime: null,
      loadEndTime: null,
      playStartTime: null,
      playEndTime: null,
      errorTime: null,
      error: null,
      networkInfo: null,
      userAgent: navigator.userAgent,
      completed: false,
    }

    // 獲取網路資訊
    if (navigator.connection) {
      session.networkInfo = {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt,
        saveData: navigator.connection.saveData,
      }
    }

    this.metrics.set(audioId, session)
    return session
  }

  /**
   * 記錄載入開始
   * @param {string} audioId - 音頻ID
   */
  recordLoadStart(audioId) {
    const session = this.metrics.get(audioId)
    if (session) {
      session.loadStartTime = performance.now()
    }
  }

  /**
   * 記錄載入完成
   * @param {string} audioId - 音頻ID
   */
  recordLoadEnd(audioId) {
    const session = this.metrics.get(audioId)
    if (session) {
      session.loadEndTime = performance.now()
    }
  }

  /**
   * 記錄播放開始
   * @param {string} audioId - 音頻ID
   */
  recordPlayStart(audioId) {
    const session = this.metrics.get(audioId)
    if (session) {
      session.playStartTime = performance.now()
    }
  }

  /**
   * 記錄播放結束
   * @param {string} audioId - 音頻ID
   */
  recordPlayEnd(audioId) {
    const session = this.metrics.get(audioId)
    if (session) {
      session.playEndTime = performance.now()
      session.completed = true
      this.analyzeSession(session)
    }
  }

  /**
   * 記錄錯誤
   * @param {string} audioId - 音頻ID
   * @param {Error} error - 錯誤對象
   */
  recordError(audioId, error) {
    const session = this.metrics.get(audioId)
    if (session) {
      session.errorTime = performance.now()
      session.error = {
        message: error.message,
        name: error.name,
        stack: error.stack,
      }
      this.analyzeSession(session)
    }
  }

  /**
   * 分析會話性能
   * @param {object} session - 監控會話
   */
  analyzeSession(session) {
    const analysis = {
      audioId: session.audioId,
      totalTime: 0,
      loadTime: 0,
      playDelay: 0,
      hasError: !!session.error,
      performance: 'good',
      recommendations: [],
    }

    // 計算總時間
    const endTime = session.playEndTime || session.errorTime || performance.now()
    analysis.totalTime = endTime - session.startTime

    // 計算載入時間
    if (session.loadStartTime && session.loadEndTime) {
      analysis.loadTime = session.loadEndTime - session.loadStartTime
    }

    // 計算播放延遲
    if (session.playStartTime) {
      analysis.playDelay = session.playStartTime - session.startTime
    }

    // 性能評估
    if (analysis.hasError) {
      analysis.performance = 'poor'
      analysis.recommendations.push('播放失敗，建議檢查網路連線或音頻檔案')
    } else if (analysis.loadTime > this.thresholds.loadTime) {
      analysis.performance = 'poor'
      analysis.recommendations.push('載入時間過長，建議優化音頻檔案大小或使用CDN')
    } else if (analysis.playDelay > this.thresholds.playDelay) {
      analysis.performance = 'fair'
      analysis.recommendations.push('播放延遲較高，建議預載音頻或優化網路')
    }

    // 網路相關建議
    if (session.networkInfo) {
      if (
        session.networkInfo.effectiveType === 'slow-2g' ||
        session.networkInfo.effectiveType === '2g'
      ) {
        analysis.recommendations.push('檢測到慢速網路，建議使用較小的音頻檔案')
      }

      if (session.networkInfo.saveData) {
        analysis.recommendations.push('使用者啟用了省流量模式，建議減少預載')
      }
    }

    // 儲存分析結果
    session.analysis = analysis

    // 輸出性能報告（開發模式）
    if (process.env.NODE_ENV === 'development') {
      this.logPerformanceReport(session)
    }

    // 清理舊記錄
    this.cleanupOldMetrics()
  }

  /**
   * 輸出性能報告
   * @param {object} session - 監控會話
   */
  logPerformanceReport(session) {
    const { analysis } = session

    console.group(`🎵 音頻播放性能報告 - ${session.audioId}`)
    console.log(`📊 性能評級: ${analysis.performance}`)
    console.log(`⏱️ 總時間: ${analysis.totalTime.toFixed(2)}ms`)
    console.log(`📥 載入時間: ${analysis.loadTime.toFixed(2)}ms`)
    console.log(`⚡ 播放延遲: ${analysis.playDelay.toFixed(2)}ms`)

    if (session.networkInfo) {
      console.log(`🌐 網路類型: ${session.networkInfo.effectiveType}`)
      console.log(`📶 下載速度: ${session.networkInfo.downlink}Mbps`)
      console.log(`📡 RTT: ${session.networkInfo.rtt}ms`)
    }

    if (analysis.hasError) {
      console.error(`❌ 錯誤: ${session.error.message}`)
    }

    if (analysis.recommendations.length > 0) {
      console.log(`💡 建議:`)
      analysis.recommendations.forEach((rec) => console.log(`   • ${rec}`))
    }

    console.groupEnd()
  }

  /**
   * 獲取性能統計
   * @returns {object} 統計資料
   */
  getPerformanceStats() {
    const sessions = Array.from(this.metrics.values())
    const completedSessions = sessions.filter((s) => s.completed || s.error)

    if (completedSessions.length === 0) {
      return {
        totalSessions: 0,
        errorRate: 0,
        averageLoadTime: 0,
        averagePlayDelay: 0,
        performanceDistribution: { good: 0, fair: 0, poor: 0 },
      }
    }

    const stats = {
      totalSessions: completedSessions.length,
      errorRate: completedSessions.filter((s) => s.error).length / completedSessions.length,
      averageLoadTime: 0,
      averagePlayDelay: 0,
      performanceDistribution: { good: 0, fair: 0, poor: 0 },
    }

    // 計算平均值
    const validLoadTimes = completedSessions
      .filter((s) => s.analysis && s.analysis.loadTime > 0)
      .map((s) => s.analysis.loadTime)

    const validPlayDelays = completedSessions
      .filter((s) => s.analysis && s.analysis.playDelay > 0)
      .map((s) => s.analysis.playDelay)

    if (validLoadTimes.length > 0) {
      stats.averageLoadTime = validLoadTimes.reduce((a, b) => a + b, 0) / validLoadTimes.length
    }

    if (validPlayDelays.length > 0) {
      stats.averagePlayDelay = validPlayDelays.reduce((a, b) => a + b, 0) / validPlayDelays.length
    }

    // 計算性能分佈
    completedSessions.forEach((session) => {
      if (session.analysis) {
        stats.performanceDistribution[session.analysis.performance]++
      }
    })

    return stats
  }

  /**
   * 獲取優化建議
   * @returns {Array} 建議列表
   */
  getOptimizationRecommendations() {
    const stats = this.getPerformanceStats()
    const recommendations = []

    if (stats.errorRate > this.thresholds.errorRate) {
      recommendations.push({
        type: 'error',
        message: `錯誤率過高 (${(stats.errorRate * 100).toFixed(1)}%)，建議檢查音頻檔案和網路狀況`,
        priority: 'high',
      })
    }

    if (stats.averageLoadTime > this.thresholds.loadTime) {
      recommendations.push({
        type: 'performance',
        message: `平均載入時間過長 (${stats.averageLoadTime.toFixed(0)}ms)，建議優化音頻檔案或使用CDN`,
        priority: 'medium',
      })
    }

    if (stats.averagePlayDelay > this.thresholds.playDelay) {
      recommendations.push({
        type: 'performance',
        message: `平均播放延遲過高 (${stats.averagePlayDelay.toFixed(0)}ms)，建議預載音頻`,
        priority: 'medium',
      })
    }

    if (stats.performanceDistribution.poor > stats.totalSessions * 0.3) {
      recommendations.push({
        type: 'optimization',
        message: '超過30%的播放性能較差，建議全面優化音頻播放策略',
        priority: 'high',
      })
    }

    return recommendations
  }

  /**
   * 清理舊的監控記錄
   */
  cleanupOldMetrics() {
    if (this.metrics.size > this.maxMetricsCount) {
      const entries = Array.from(this.metrics.entries())
      const toDelete = entries
        .sort((a, b) => a[1].startTime - b[1].startTime)
        .slice(0, this.metrics.size - this.maxMetricsCount)

      toDelete.forEach(([audioId]) => {
        this.metrics.delete(audioId)
      })
    }
  }

  /**
   * 重置監控數據
   */
  reset() {
    this.metrics.clear()
  }

  /**
   * 啟用/禁用監控
   * @param {boolean} enabled - 是否啟用
   */
  setEnabled(enabled) {
    this.isEnabled = enabled
  }

  /**
   * 導出性能數據
   * @returns {object} 性能數據
   */
  exportData() {
    return {
      metrics: Array.from(this.metrics.entries()),
      stats: this.getPerformanceStats(),
      recommendations: this.getOptimizationRecommendations(),
      timestamp: Date.now(),
    }
  }
}

// 創建全域實例
const performanceMonitor = new PerformanceMonitor()

export default performanceMonitor
