/**
 * AnimationOptimizer - CSS 動畫性能優化工具
 *
 * 根據裝置性能和使用者偏好優化動畫效果
 */

class AnimationOptimizer {
  constructor() {
    this.isLowPerformanceDevice = this.detectLowPerformanceDevice()
    this.prefersReducedMotion = this.checkReducedMotionPreference()
    this.isLowPowerMode = this.detectLowPowerMode()

    this.optimizationLevel = this.calculateOptimizationLevel()
    this.animationConfig = this.getOptimalAnimationConfig()
  }

  /**
   * 檢測低性能裝置
   * @returns {boolean}
   */
  detectLowPerformanceDevice() {
    // 檢查硬體記憶體
    if (navigator.deviceMemory && navigator.deviceMemory < 4) {
      return true
    }

    // 檢查 CPU 核心數
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
      return true
    }

    // 檢查網路連線類型
    if (navigator.connection) {
      const connection = navigator.connection
      if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
        return true
      }
    }

    // 檢查 User Agent（簡單的行動裝置檢測）
    const userAgent = navigator.userAgent.toLowerCase()
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
      userAgent
    )

    if (isMobile) {
      // 檢查是否為較舊的行動裝置
      const isOldMobile = /android [1-4]|iphone os [1-9]|ipad.*os [1-9]/i.test(userAgent)
      return isOldMobile
    }

    return false
  }

  /**
   * 檢查減少動畫偏好設定
   * @returns {boolean}
   */
  checkReducedMotionPreference() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  /**
   * 檢測低功耗模式
   * @returns {boolean}
   */
  detectLowPowerMode() {
    // 檢查省電模式偏好
    if (window.matchMedia('(prefers-reduced-data: reduce)').matches) {
      return true
    }

    // 檢查電池狀態（如果可用）
    if ('getBattery' in navigator) {
      navigator
        .getBattery()
        .then((battery) => {
          if (battery.level < 0.2 && !battery.charging) {
            this.isLowPowerMode = true
            this.updateOptimizationLevel()
          }
        })
        .catch(() => {
          // 忽略錯誤
        })
    }

    return false
  }

  /**
   * 計算優化等級
   * @returns {string} 'none' | 'light' | 'moderate' | 'aggressive'
   */
  calculateOptimizationLevel() {
    if (this.prefersReducedMotion) {
      return 'aggressive'
    }

    if (this.isLowPerformanceDevice && this.isLowPowerMode) {
      return 'aggressive'
    }

    if (this.isLowPerformanceDevice || this.isLowPowerMode) {
      return 'moderate'
    }

    return 'none'
  }

  /**
   * 獲取最佳動畫配置
   * @returns {object}
   */
  getOptimalAnimationConfig() {
    const configs = {
      none: {
        enableTransitions: true,
        enableAnimations: true,
        transitionDuration: 'normal',
        animationDuration: 'normal',
        useGPUAcceleration: true,
        enableComplexAnimations: true,
        maxConcurrentAnimations: 10,
      },
      light: {
        enableTransitions: true,
        enableAnimations: true,
        transitionDuration: 'fast',
        animationDuration: 'fast',
        useGPUAcceleration: true,
        enableComplexAnimations: true,
        maxConcurrentAnimations: 8,
      },
      moderate: {
        enableTransitions: true,
        enableAnimations: true,
        transitionDuration: 'fast',
        animationDuration: 'reduced',
        useGPUAcceleration: false,
        enableComplexAnimations: false,
        maxConcurrentAnimations: 5,
      },
      aggressive: {
        enableTransitions: false,
        enableAnimations: false,
        transitionDuration: 'none',
        animationDuration: 'none',
        useGPUAcceleration: false,
        enableComplexAnimations: false,
        maxConcurrentAnimations: 0,
      },
    }

    return configs[this.optimizationLevel]
  }

  /**
   * 初始化動畫優化器
   * 應在應用程式掛載後呼叫一次，負責設定媒體查詢監聽器並套用 CSS 變數。
   * 將副作用（DOM 操作、事件綁定）集中於此，確保 import 時不產生任何副作用。
   */
  init() {
    this.setupPreferenceListeners()
    this.applyCSSVariables()
    window.addEventListener('animation-config-updated', () => {
      this.applyCSSVariables()
    })
  }

  /**
   * 設置偏好設定監聽器
   */
  setupPreferenceListeners() {
    // 監聽減少動畫偏好變化
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedMotionQuery.addEventListener('change', (e) => {
      this.prefersReducedMotion = e.matches
      this.updateOptimizationLevel()
    })

    // 監聽省流量偏好變化
    const reducedDataQuery = window.matchMedia('(prefers-reduced-data: reduce)')
    reducedDataQuery.addEventListener('change', (e) => {
      this.isLowPowerMode = e.matches
      this.updateOptimizationLevel()
    })
  }

  /**
   * 更新優化等級
   */
  updateOptimizationLevel() {
    const newLevel = this.calculateOptimizationLevel()
    if (newLevel !== this.optimizationLevel) {
      this.optimizationLevel = newLevel
      this.animationConfig = this.getOptimalAnimationConfig()

      // 觸發配置更新事件
      window.dispatchEvent(
        new CustomEvent('animation-config-updated', {
          detail: { level: this.optimizationLevel, config: this.animationConfig },
        })
      )
    }
  }

  /**
   * 獲取 CSS 變數值
   * @returns {object}
   */
  getCSSVariables() {
    const config = this.animationConfig

    return {
      '--transition-duration-fast':
        config.transitionDuration === 'none'
          ? '0ms'
          : config.transitionDuration === 'fast'
            ? '100ms'
            : '200ms',
      '--transition-duration-normal':
        config.transitionDuration === 'none'
          ? '0ms'
          : config.transitionDuration === 'fast'
            ? '150ms'
            : '300ms',
      '--transition-duration-slow':
        config.transitionDuration === 'none'
          ? '0ms'
          : config.transitionDuration === 'fast'
            ? '200ms'
            : '500ms',
      '--animation-duration-fast':
        config.animationDuration === 'none'
          ? '0ms'
          : config.animationDuration === 'reduced'
            ? '800ms'
            : '1200ms',
      '--animation-duration-normal':
        config.animationDuration === 'none'
          ? '0ms'
          : config.animationDuration === 'reduced'
            ? '1200ms'
            : '2000ms',
      '--animation-duration-slow':
        config.animationDuration === 'none'
          ? '0ms'
          : config.animationDuration === 'reduced'
            ? '1800ms'
            : '3000ms',
      '--gpu-acceleration': config.useGPUAcceleration ? 'translateZ(0)' : 'none',
      '--will-change': config.useGPUAcceleration ? 'transform, opacity' : 'auto',
    }
  }

  /**
   * 應用 CSS 變數到文檔
   */
  applyCSSVariables() {
    const variables = this.getCSSVariables()
    const root = document.documentElement

    Object.entries(variables).forEach(([property, value]) => {
      root.style.setProperty(property, value)
    })
  }

  /**
   * 檢查是否應該啟用特定動畫
   * @param {string} animationType - 動畫類型
   * @returns {boolean}
   */
  shouldEnableAnimation(animationType) {
    const config = this.animationConfig

    switch (animationType) {
      case 'transition':
        return config.enableTransitions
      case 'animation':
        return config.enableAnimations
      case 'complex':
        return config.enableComplexAnimations
      default:
        return config.enableAnimations
    }
  }

  /**
   * 獲取優化的動畫持續時間
   * @param {string} duration - 原始持續時間 ('fast' | 'normal' | 'slow')
   * @returns {string}
   */
  getOptimizedDuration(duration) {
    const variables = this.getCSSVariables()

    switch (duration) {
      case 'fast':
        return variables['--transition-duration-fast']
      case 'normal':
        return variables['--transition-duration-normal']
      case 'slow':
        return variables['--transition-duration-slow']
      default:
        return variables['--transition-duration-normal']
    }
  }

  /**
   * 創建優化的 CSS 類別名稱
   * @param {string} baseClass - 基礎類別名稱
   * @returns {string}
   */
  getOptimizedClassName(baseClass) {
    const suffix = this.optimizationLevel !== 'none' ? `-${this.optimizationLevel}` : ''
    return `${baseClass}${suffix}`
  }

  /**
   * 獲取性能報告
   * @returns {object}
   */
  getPerformanceReport() {
    return {
      optimizationLevel: this.optimizationLevel,
      isLowPerformanceDevice: this.isLowPerformanceDevice,
      prefersReducedMotion: this.prefersReducedMotion,
      isLowPowerMode: this.isLowPowerMode,
      animationConfig: this.animationConfig,
      deviceInfo: {
        memory: navigator.deviceMemory,
        cores: navigator.hardwareConcurrency,
        connection: navigator.connection
          ? {
              effectiveType: navigator.connection.effectiveType,
              downlink: navigator.connection.downlink,
              saveData: navigator.connection.saveData,
            }
          : null,
      },
    }
  }

  /**
   * 重置優化設定
   */
  reset() {
    this.isLowPerformanceDevice = this.detectLowPerformanceDevice()
    this.prefersReducedMotion = this.checkReducedMotionPreference()
    this.isLowPowerMode = this.detectLowPowerMode()
    this.updateOptimizationLevel()
  }
}

// 建立全域單例；呼叫端須在應用程式掛載後呼叫 animationOptimizer.init() 以啟用副作用
const animationOptimizer = new AnimationOptimizer()

export default animationOptimizer
