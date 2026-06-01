const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // Kiosk exit
  tryExit: (password) => ipcRenderer.send('try-exit', password),
  onExitFailed: (callback) => ipcRenderer.on('exit-failed', callback),

  // Session management
  userClockedIn: (slotEndTime) => ipcRenderer.send('user-clocked-in', { slotEndTime }),
  userClockedOut: () => ipcRenderer.send('user-clocked-out'),
  onAutoClockout: (callback) => ipcRenderer.on('auto-clockout', callback),
})