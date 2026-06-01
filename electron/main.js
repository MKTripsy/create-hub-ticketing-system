const { app, BrowserWindow, ipcMain, Notification, shell } = require('electron')
const path = require('path')

const ADMIN_PASSWORD = 'password'
const isDev = process.argv.includes('--dev')
let win
let notificationTimers = []

function clearNotificationTimers() {
  notificationTimers.forEach(t => clearTimeout(t))
  notificationTimers = []
}

function scheduleNotifications(slotEndTime) {
  clearNotificationTimers()

  const endTime = new Date(slotEndTime).getTime()
  const now = Date.now()

  const alerts = [
    { minsLeft: 30, message: '30 minutes remaining in your session!' },
    { minsLeft: 15, message: '15 minutes remaining in your session!' },
    { minsLeft: 5,  message: '5 minutes remaining in your session!' },
    { minsLeft: 1,  message: '1 minute remaining — please wrap up!' },
  ]

  alerts.forEach(({ minsLeft, message }) => {
    const triggerAt = endTime - (minsLeft * 60 * 1000)
    const delay = triggerAt - now

    if (delay > 0) {
      const timer = setTimeout(() => {
        new Notification({
          title: 'Create Hub — Session Reminder',
          body: message,
        }).show()
      }, delay)
      notificationTimers.push(timer)
    }
  })

  // Auto clock-out timer
  const autoClockOutDelay = endTime - now
  if (autoClockOutDelay > 0) {
    const timer = setTimeout(() => {
      if (win) {
        // Tell scan page to auto clock-out
        win.webContents.send('auto-clockout')
        
        // Force window to front
        win.setAlwaysOnTop(true)   // ← force on top
        win.show()
        win.restore()
        win.focus()
        win.maximize()
        win.setAlwaysOnTop(false)  // ← remove always on top after showing
        
        // Re-enable kiosk in production
        if (!isDev) {
          win.setKiosk(true)
          win.setFullScreen(true)
        }
      }
    }, autoClockOutDelay)
    notificationTimers.push(timer)
  }
}

function createWindow() {
  win = new BrowserWindow({
    fullscreen: !isDev,
    kiosk: !isDev,
    width: isDev ? 1200 : undefined,
    height: isDev ? 800 : undefined,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  const url = isDev
  ? 'http://localhost:3000/scan'
  : 'https://create-hub-ticketing-system.vercel.app/scan'  // ← replace with your Vercel URL

  win.loadURL(url)

  // User clocked in — minimize and start timers
  ipcMain.on('user-clocked-in', (event, { slotEndTime }) => {
    scheduleNotifications(slotEndTime)
    setTimeout(() => {
      win.minimize()
    }, 3000) // ← wait 3 seconds so user sees the clocked-in screen
  })

  // User clocked out manually — clear timers, go fullscreen for next user
  ipcMain.on('user-clocked-out', () => {
    clearNotificationTimers()
    setTimeout(() => {
      if (win) {
        win.setAlwaysOnTop(true)
        win.show()
        win.restore()
        win.focus()
        win.maximize()
        win.setAlwaysOnTop(false)
        if (!isDev) {
          win.setKiosk(true)
          win.setFullScreen(true)
        }
      }
    }, 5000)
  })

  // Password exit
  ipcMain.on('try-exit', (event, password) => {
    if (password === ADMIN_PASSWORD) {
      win.setKiosk(false)
      win.setFullScreen(false)
    } else {
      event.reply('exit-failed')
    }
  })
}

app.whenReady().then(createWindow)

// Re-enable kiosk when user clicks taskbar to restore
app.on('browser-window-focus', () => {
  // Only re-enable kiosk if a user is NOT clocked in
  // (handled by the scan page state)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

const AutoLaunch = require('auto-launch')

const autoLauncher = new AutoLaunch({
  name: 'Create Hub Attendance',
  path: app.getPath('exe'),
  isHidden: false,
})

app.whenReady().then(() => {
  // if (!isDev) {
  //   autoLauncher.isEnabled().then((isEnabled) => {
  //     if (!isEnabled) autoLauncher.enable()
  //   })
  // }
  createWindow()
})