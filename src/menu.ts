/*
 *  Copyright 2018 Luke Klinker
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import { app, BrowserView, dialog, Menu, Tray } from "electron";
import * as path from "path";

import DesktopPreferences from "./preferences";
import BrowserviewPreparer from "./window/browserview-preparer";

export default class PulseMenu {

  private browserviewPreparer = new BrowserviewPreparer();
  private preferences = new DesktopPreferences();

  private notificationPreferencesMenu: any = {
    label: "Notification Preferences",
    submenu: [{
        checked: this.preferences.showNotifications(),
        click: () => {
          this.preferences.toggleShowNotifications();
        },
        label: "Show Notifications",
        type: "checkbox",
      }, {
        checked: this.preferences.notificationSounds(),
        click: () => {
          this.preferences.toggleNotificationSounds();
        },
        label: "Play Notification Sound",
        type: "checkbox",
      }, { type: "separator" }, {
        checked: this.preferences.notificationSenderPreviews(),
        click: () => {
          this.preferences.toggleNotificationSenderPreviews();
        },
        label: "Display Sender in Notification",
        type: "checkbox",
      }, {
        checked: this.preferences.notificationMessagePreviews(),
        click: () => {
          this.preferences.toggleNotificationMessagePreviews();
        },
        label: "Display Message Preview in Notification",
        type: "checkbox",
      }, { type: "separator" }, {
        label: "Snooze Desktop Notifications",
        submenu: [{
            checked: this.preferences.isSnoozeActive() && this.preferences.currentSnoozeSelection() === "30_mins",
            click: () => {
              this.preferences.snooze("30_mins");
            },
            label: "30 mins",
            type: "checkbox",
          }, {
            checked: this.preferences.isSnoozeActive() && this.preferences.currentSnoozeSelection() === "1_hour",
            click: () => {
              this.preferences.snooze("1_hour");
            },
            label: "1 hour",
            type: "checkbox",
          }, {
            checked: this.preferences.isSnoozeActive() && this.preferences.currentSnoozeSelection() === "3_hours",
            click: () => {
              this.preferences.snooze("3_hours");
            },
            label: "3 hours",
            type: "checkbox",
          }, {
            checked: this.preferences.isSnoozeActive() && this.preferences.currentSnoozeSelection() === "12_hours",
            click: () => {
              this.preferences.snooze("12_hours");
            },
            label: "12 hours",
            type: "checkbox",
          },
        ],
      },
    ],
  };

  public buildMenu = (windowProvider, tray, webSocket) => {
    const template: any[] = [{
      label: "Preferences",
      submenu: [ this.notificationPreferencesMenu, { type: "separator" }, {
        checked: this.preferences.minimizeToTray(),
        click: () => {
          const toTray = !this.preferences.minimizeToTray();
          this.preferences.toggleMinimizeToTray();

          if (!toTray && tray != null) {
            tray.destroy();
          } else {
            tray = this.buildTray(windowProvider, webSocket);
          }
        },
        label: process.platform === "darwin" ? "Show in Menu Bar" : "Show in Tray",
        type: "checkbox",
      } ],
    }, {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "pasteandmatchstyle" },
        { role: "delete" },
        { role: "selectall" },
      ],
    }, {
      label: "View",
      submenu: [{
        accelerator: "CmdOrCtrl+R",
        click: (item, focusedWindow) => {
          windowProvider.getBrowserView().webContents.loadURL("https://pulsesms.app");
        },
        label: "Reload",
      }, {
        accelerator: "CmdOrCtrl+I",
        click: (item, focusedWindow) => {
          windowProvider.getBrowserView().webContents.toggleDevTools();
        },
        label: "Toggle Developer Tools",
      },
      { type: "separator" },
      { role: "resetzoom" },
      { role: "zoomin" },
      { role: "zoomout" },
      { type: "separator" },
      { role: "togglefullscreen" },
    ],
    }, {
      role: "window",
      submenu: [
        { role: "minimize" },
        { role: "close" },
      ],
    }, {
      role: "help",
      submenu: [ {
          click: () => {
            require("electron").shell.openExternal("https://github.com/klinker-apps/messenger-desktop/releases");
          },
          label: require("electron").app.getVersion(),
        }, {
          click: () => {
            require("electron").shell.openExternal("https://messenger.klinkerapps.com/help");
          },
          label: "Get Help",
        }, {
          click: () => {
            require("electron").shell.openExternal("https://messenger.klinkerapps.com/overview");
          },
          label: "Platform Support",
        }, {
          click: () => {
            // tslint:disable-next-line:max-line-length
            require("electron").shell.openExternal("https://play.google.com/store/apps/details?id=xyz.klinker.messenger");
          },
          label: "Get it on Google Play",
        },

      ],
    }];

    template[0].submenu.push({
      checked: this.preferences.badgeDockIcon(),
      click: () => {
        const badge = !this.preferences.badgeDockIcon();
        this.preferences.toggleBadgeDockIcon();

        if (!badge) {
          if (process.platform !== "win32") {
            require("electron").app.setBadgeCount(0);
          }

          if (process.platform === "darwin" && tray != null) {
            tray.setTitle("");
          }

          if (process.platform === "win32") {
            windowProvider.getWindow().setOverlayIcon(null, "No Unread Conversations");
            if (tray != null) {
              tray.setImage(path.resolve(__dirname, "assets/tray/windows.ico"));
            }
          }
        }
      },
      label: process.platform !== "win32" ? "Show Unread Count on Icon" : "Show Unread Indicator on Icon",
      type: "checkbox",
    });

    if (app.getLocale().indexOf("en") > -1) {
      template[0].submenu.push({
        checked: this.preferences.useSpellcheck(),
        click() {
          const useIt = !this.preferences.useSpellcheck();
          this.preferences.toggleUseSpellcheck();

          const dialogOpts = {
            buttons: ["Restart", "Later"],
            detail: 'Hit \"Restart\", then re-open the app, to apply the preference.',
            message: "This preference will not be applied until the app is restarted.",
            title: "App Restart Required",
            type: "info",
          };

          try {
            dialog.showMessageBox(dialogOpts, (response) => {
              if (response === 0) {
                webSocket.closeWebSocket();
                app.exit(0);
              }
            });
          } catch (err) {
            // no-op
          }
        },
        label: "Use Spellcheck",
        type: "checkbox",
      });
    }

    if (process.platform === "win32") {
      template[0].submenu.push({
        checked: this.preferences.openAtLogin(),
        click() {
          const autoOpen = !this.preferences.openAtLogin();
          this.preferences.toggleOpenAtLogin();
          app.setLoginItemSettings({ openAtLogin: autoOpen });
        },
        label: "Auto-Open at Login",
        type: "checkbox",
      });
    }

    if (process.platform === "darwin") {
      const name = require("electron").app.getName();
      template.unshift({
        label: name,
        submenu: [
          { type: "separator" },
          { label: "Hide Pulse", role: "hide" },
          { role: "hideothers" },
          { role: "unhide" },
          { type: "separator" },
          { label: "Quit Pulse", role: "quit" },
        ],
      });

      // Edit menu
      template[2].submenu.push(
        { type: "separator" },
        { label: "Speech", submenu: [
          { role: "startspeaking" },
          { role: "stopspeaking" },
        ]},
      );

      // Windows menu
      template[4].submenu = [
        { accelerator: "CmdOrCtrl+W", label: "Close", role: "close" },
        { label: "Minimize", accelerator: "CmdOrCtrl+M", role: "minimize" },
        { label: "Zoom", role: "zoom" },
        { type: "separator" },
        { label: "Bring All to Front", role: "front" },
      ];
    } else {
      template[0].submenu.push({
        checked: this.preferences.autoHideMenuBar(),
        click: () => {
          const autoHide = !this.preferences.autoHideMenuBar();
          this.preferences.toggleAutoHideMenuBar();

          windowProvider.getWindow().setAutoHideMenuBar(autoHide);
          windowProvider.getWindow().setMenuBarVisibility(!autoHide);

          this.browserviewPreparer.prepare(windowProvider.getWindow(), windowProvider.getBrowserView());
        },
        label: "Auto-hide Menu Bar",
        type: "checkbox",
      });
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

    // if they turn on auto hide, then this should be hidden.
    // if they turn off auto hide, we will show this menu bar immediately.
    windowProvider.getWindow().setMenuBarVisibility(!this.preferences.autoHideMenuBar());
    windowProvider.getWindow().setAutoHideMenuBar(this.preferences.autoHideMenuBar());
  }

  public buildTray = (windowProvider, webSocket) => {
    if (!this.preferences.minimizeToTray()) {
      return;
    }

    let iconName = null;
    if (process.platform === "darwin") {
      iconName = "macTemplate.png";
    } else if (process.platform === "win32") {
      iconName = "windows.ico";
    } else {
      iconName = "linux.png";
    }

    const tray = new Tray(path.resolve(__dirname, "assets/tray/" + iconName));
    if (process.platform === "darwin") {
      tray.setPressedImage(path.resolve(__dirname, "assets/tray/macHighlight.png"));
    }

    const contextMenu = Menu.buildFromTemplate([{
      click: () => {
        this.showWindow(windowProvider);
      },
      label: "Show Pulse",
    }, {
      click: () => {
        this.showPoupWindow(windowProvider);
      },
      label: "Show Popup Window",
    }, this.notificationPreferencesMenu, {
      accelerator: "Command+Q",
      click: () => {
        webSocket.closeWebSocket();
        app.exit(0);
      },
      label: "Quit",
    }]);
    tray.setToolTip("Pulse SMS");
    tray.setContextMenu(contextMenu);

    tray.on("click", () => {
      this.showWindow(windowProvider);
    });

    return tray;
  }

  private showWindow = (windowProvider) => {
    if (windowProvider.getWindow() != null) {
      windowProvider.getWindow().show();
      if (process.platform === "darwin") {
        app.dock.show();
      }
    } else {
      windowProvider.createMainWindow();
    }
  }

  private showPoupWindow = (windowProvider) => {
    if (windowProvider.getReplyWindow() !== null) {
      windowProvider.getReplyWindow().show();
      windowProvider.getReplyWindow().focus();
    } else {
      windowProvider.createReplyWindow();
    }
  }

}

