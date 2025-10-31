import {
  changeCurrentProfile,
  getAppConfig,
  getControledMihomoConfig,
  getProfileConfig,
  patchAppConfig,
  patchControledMihomoConfig
} from '../config'
import icoIcon from '../../../resources/icon.ico?asset'
import pngIcon from '../../../resources/icon.png?asset'
import templateIcon from '../../../resources/iconTemplate.png?asset'
import {
  mihomoChangeProxy,
  mihomoCloseAllConnections,
  mihomoGroups,
  mihomoGroupDelay,
  patchMihomoConfig
} from '../core/mihomoApi'
import { mainWindow, setNotQuitDialog, showMainWindow, triggerMainWindow } from '..'
import { app, clipboard, ipcMain, Menu, nativeImage, shell, Tray } from 'electron'
import { dataDir, logDir, mihomoCoreDir, mihomoWorkDir } from '../utils/dirs'
import { triggerSysProxy } from '../sys/sysproxy'
import { quitWithoutCore, restartCore } from '../core/manager'
import { floatingWindow, triggerFloatingWindow } from './floatingWindow'

export let tray: Tray | null = null

export const buildContextMenu = async (): Promise<Menu> => {
  const { mode, tun } = await getControledMihomoConfig()
  const {
    sysProxy,
    onlyActiveDevice = false,
    envType = process.platform === 'win32' ? ['powershell'] : ['bash'],
    autoCloseConnection,
    proxyInTray = true,
    triggerSysProxyShortcut = '',
    showFloatingWindowShortcut = '',
    showWindowShortcut = '',
    triggerTunShortcut = '',
    ruleModeShortcut = '',
    globalModeShortcut = '',
    directModeShortcut = '',
    quitWithoutCoreShortcut = '',
    restartAppShortcut = ''
  } = await getAppConfig()
  let groupsMenu: Electron.MenuItemConstructorOptions[] = []
  if (proxyInTray && process.platform !== 'linux') {
    try {
      const groups = await mihomoGroups()
      groupsMenu = groups.map((group) => {
        const currentProxy = group.all.find((proxy) => proxy.name === group.now)
        const delay = currentProxy?.history.length
          ? currentProxy.history[currentProxy.history.length - 1].delay
          : -1
        let displayDelay = ''
        if (delay === 0) {
          displayDelay = '(Timeout)'
        } else if (delay > 0) {
          displayDelay = `(${delay}ms)`
        }

        return {
          id: group.name,
          label: `${group.name}   ${displayDelay}`,
          type: 'submenu',
          submenu: [
            {
              id: `${group.name}-test`,
              label: '重新测试',
              type: 'normal',
              click: async (): Promise<void> => {
                try {
                  await mihomoGroupDelay(group.name, group.testUrl)
                  ipcMain.emit('updateTrayMenu')
                } catch (e) {
                  // ignore
                }
              }
            },
            { type: 'separator' },
            ...group.all.map((proxy) => {
              const proxyDelay = proxy.history.length
                ? proxy.history[proxy.history.length - 1].delay
                : -1
              let proxyDisplayDelay = `(${proxyDelay}ms)`
              if (proxyDelay === -1) {
                proxyDisplayDelay = ''
              }
              if (proxyDelay === 0) {
                proxyDisplayDelay = '(Timeout)'
              }
              return {
                id: proxy.name,
                label: `${proxy.name}   ${proxyDisplayDelay}`,
                type: 'radio' as const,
                checked: proxy.name === group.now,
                click: async (): Promise<void> => {
                  await mihomoChangeProxy(group.name, proxy.name)
                  if (autoCloseConnection) {
                    await mihomoCloseAllConnections()
                  }
                }
              }
            })
          ]
        }
      })
      groupsMenu.unshift({ type: 'separator' })
    } catch (e) {
      // ignore
      // 避免出错时无法创建托盘菜单
    }
  }
  const { current, items = [] } = await getProfileConfig()

  const contextMenu = [
    {
      id: 'show',
      accelerator: showWindowShortcut,
      label: '显示窗口',
      type: 'normal',
      click: (): void => {
        showMainWindow()
      }
    },
    {
      id: 'show-floating',
      accelerator: showFloatingWindowShortcut,
      label: floatingWindow?.isVisible() ? '关闭悬浮窗' : '显示悬浮窗',
      type: 'normal',
      click: async (): Promise<void> => {
        await triggerFloatingWindow()
      }
    },
    { type: 'separator' },
    {
      type: 'checkbox',
      label: '系统代理',
      accelerator: triggerSysProxyShortcut,
      checked: sysProxy.enable,
      click: async (item): Promise<void> => {
        const enable = item.checked
        try {
          await triggerSysProxy(enable, onlyActiveDevice)
          await patchAppConfig({ sysProxy: { enable } })
          mainWindow?.webContents.send('appConfigUpdated')
          floatingWindow?.webContents.send('appConfigUpdated')
        } catch (e) {
          // ignore
        } finally {
          ipcMain.emit('updateTrayMenu')
        }
      }
    },
    {
      type: 'checkbox',
      label: '虚拟网卡',
      accelerator: triggerTunShortcut,
      checked: tun?.enable ?? false,
      click: async (item): Promise<void> => {
        const enable = item.checked
        try {
          if (enable) {
            await patchControledMihomoConfig({ tun: { enable }, dns: { enable: true } })
          } else {
            await patchControledMihomoConfig({ tun: { enable } })
          }
          mainWindow?.webContents.send('controledMihomoConfigUpdated')
          floatingWindow?.webContents.send('controledMihomoConfigUpdated')
          await restartCore()
        } catch {
          // ignore
        } finally {
          ipcMain.emit('updateTrayMenu')
        }
      }
    },
    { type: 'separator' },
    {
      type: 'submenu',
      label: `出站模式 (${mode === 'rule' ? '规则' : mode === 'global' ? '全局' : '直连'})`,
      submenu: [
        {
          id: 'rule',
          label: '规则模式',
          accelerator: ruleModeShortcut,
          type: 'radio',
          checked: mode === 'rule',
          click: async (): Promise<void> => {
            await patchControledMihomoConfig({ mode: 'rule' })
            await patchMihomoConfig({ mode: 'rule' })
            mainWindow?.webContents.send('controledMihomoConfigUpdated')
            mainWindow?.webContents.send('groupsUpdated')
            ipcMain.emit('updateTrayMenu')
          }
        },
        {
          id: 'global',
          label: '全局模式',
          accelerator: globalModeShortcut,
          type: 'radio',
          checked: mode === 'global',
          click: async (): Promise<void> => {
            await patchControledMihomoConfig({ mode: 'global' })
            await patchMihomoConfig({ mode: 'global' })
            mainWindow?.webContents.send('controledMihomoConfigUpdated')
            mainWindow?.webContents.send('groupsUpdated')
            ipcMain.emit('updateTrayMenu')
          }
        },
        {
          id: 'direct',
          label: '直连模式',
          accelerator: directModeShortcut,
          type: 'radio',
          checked: mode === 'direct',
          click: async (): Promise<void> => {
            await patchControledMihomoConfig({ mode: 'direct' })
            await patchMihomoConfig({ mode: 'direct' })
            mainWindow?.webContents.send('controledMihomoConfigUpdated')
            mainWindow?.webContents.send('groupsUpdated')
            ipcMain.emit('updateTrayMenu')
          }
        }
      ]
    },
    ...groupsMenu,
    { type: 'separator' },
    {
      type: 'submenu',
      label: '配置',
      submenu: items.map((item) => {
        return {
          type: 'radio',
          label: item.name,
          checked: item.id === current,
          click: async (): Promise<void> => {
            if (item.id === current) return
            await changeCurrentProfile(item.id)
            mainWindow?.webContents.send('profileConfigUpdated')
            ipcMain.emit('updateTrayMenu')
          }
        }
      })
    },
    { type: 'separator' },
    {
      type: 'submenu',
      label: '打开目录',
      submenu: [
        {
          type: 'normal',
          label: '应用目录',
          click: (): Promise<string> => shell.openPath(dataDir())
        },
        {
          type: 'normal',
          label: '工作目录',
          click: (): Promise<string> => shell.openPath(mihomoWorkDir())
        },
        {
          type: 'normal',
          label: '内核目录',
          click: (): Promise<string> => shell.openPath(mihomoCoreDir())
        },
        {
          type: 'normal',
          label: '日志目录',
          click: (): Promise<string> => shell.openPath(logDir())
        }
      ]
    },
    envType.length > 1
      ? {
          type: 'submenu',
          label: '复制环境变量',
          submenu: envType.map((type) => {
            return {
              id: type,
              label: type,
              type: 'normal',
              click: async (): Promise<void> => {
                await copyEnv(type)
              }
            }
          })
        }
      : {
          id: 'copyenv',
          label: '复制环境变量',
          type: 'normal',
          click: async (): Promise<void> => {
            await copyEnv(envType[0])
          }
        },
    { type: 'separator' },
    {
      id: 'quitWithoutCore',
      label: '轻量模式',
      type: 'normal',
      accelerator: quitWithoutCoreShortcut,
      click: (): void => {
        setNotQuitDialog()
        quitWithoutCore()
      }
    },
    {
      id: 'restart',
      label: '重启应用',
      type: 'normal',
      accelerator: restartAppShortcut,
      click: (): void => {
        setNotQuitDialog()
        app.relaunch()
        app.quit()
      }
    },
    {
      id: 'quit',
      label: '退出应用',
      type: 'normal',
      accelerator: 'CommandOrControl+Q',
      click: (): void => {
        setNotQuitDialog()
        app.quit()
      }
    }
  ] as Electron.MenuItemConstructorOptions[]
  return Menu.buildFromTemplate(contextMenu)
}

export async function createTray(): Promise<void> {
  const { useDockIcon = true } = await getAppConfig()
  if (process.platform === 'linux') {
    tray = new Tray(pngIcon)
    const menu = await buildContextMenu()
    tray.setContextMenu(menu)
  }
  if (process.platform === 'darwin') {
    const icon = nativeImage.createFromPath(templateIcon).resize({ height: 16 })
    icon.setTemplateImage(true)
    tray = new Tray(icon)
  }
  if (process.platform === 'win32') {
    tray = new Tray(icoIcon)
  }
  tray?.setToolTip('Sparkle')
  tray?.setIgnoreDoubleClickEvents(true)
  if (process.platform === 'darwin') {
    if (!useDockIcon && app.dock) {
      app.dock.hide()
    }
    ipcMain.on('trayIconUpdate', async (_, png: string) => {
      const image = nativeImage.createFromDataURL(png).resize({ height: 16 })
      image.setTemplateImage(true)
      tray?.setImage(image)
    })
    tray?.addListener('right-click', async () => {
      triggerMainWindow()
    })
    tray?.addListener('click', async () => {
      await updateTrayMenu()
    })
  }
  if (process.platform === 'win32') {
    tray?.addListener('click', () => {
      triggerMainWindow()
    })
    tray?.addListener('right-click', async () => {
      await updateTrayMenu()
    })
  }
  if (process.platform === 'linux') {
    tray?.addListener('click', () => {
      triggerMainWindow()
    })
    ipcMain.on('updateTrayMenu', async () => {
      await updateTrayMenu()
    })
  }
}

async function updateTrayMenu(): Promise<void> {
  const menu = await buildContextMenu()
  tray?.popUpContextMenu(menu) // 弹出菜单
  if (process.platform === 'linux') {
    tray?.setContextMenu(menu)
  }
}

export async function copyEnv(type: 'bash' | 'cmd' | 'powershell' | 'nushell'): Promise<void> {
  const { 'mixed-port': mixedPort = 7890 } = await getControledMihomoConfig()
  const { sysProxy } = await getAppConfig()
  const { host, bypass = [] } = sysProxy
  switch (type) {
    case 'bash': {
      clipboard.writeText(
        `export https_proxy=http://${host || '127.0.0.1'}:${mixedPort} http_proxy=http://${host || '127.0.0.1'}:${mixedPort} all_proxy=http://${host || '127.0.0.1'}:${mixedPort} no_proxy=${bypass.join(',')}`
      )
      break
    }
    case 'cmd': {
      clipboard.writeText(
        `set http_proxy=http://${host || '127.0.0.1'}:${mixedPort}\r\nset https_proxy=http://${host || '127.0.0.1'}:${mixedPort}\r\nset no_proxy=${bypass.join(',')}`
      )
      break
    }
    case 'powershell': {
      clipboard.writeText(
        `$env:HTTP_PROXY="http://${host || '127.0.0.1'}:${mixedPort}"; $env:HTTPS_PROXY="http://${host || '127.0.0.1'}:${mixedPort}"; $env:no_proxy="${bypass.join(',')}"`
      )
      break
    }
    case 'nushell': {
      clipboard.writeText(
        `load-env {http_proxy:"http://${host || '127.0.0.1'}:${mixedPort}", https_proxy:"http://${host || '127.0.0.1'}:${mixedPort}", no_proxy:"${bypass.join(',')}"}`
      )
      break
    }
  }
}

export async function showTrayIcon(): Promise<void> {
  if (!tray) {
    await createTray()
  }
}

export async function closeTrayIcon(): Promise<void> {
  if (tray) {
    tray.destroy()
  }
  tray = null
}
