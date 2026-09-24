'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mascot', {
  move: (x, y) => ipcRenderer.send('move', x, y),
  setIgnore: (ignore) => ipcRenderer.send('set-ignore', ignore),
  getBounds: () => ipcRenderer.invoke('get-bounds'),
  getSize: () => ipcRenderer.invoke('get-size'),
  getSound: () => ipcRenderer.invoke('get-sound'),
  getPet: () => ipcRenderer.invoke('get-pet'),
  savePet: (pet) => ipcRenderer.send('save-pet', pet),
  getWorkArea: (point) => ipcRenderer.invoke('get-work-area', point),
  showMenu: () => ipcRenderer.send('context-menu'),
  onCommand: (cb) => ipcRenderer.on('command', (_e, cmd) => cb(cmd)),
});
