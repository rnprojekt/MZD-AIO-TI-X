/* ************************************************************************** *\
|** ************************************************************************ **|
|** MZD-AIO-TI                                                               **|
|** By: Trezdog44 - Trevor Martin                                            **|
|** http://mazdatweaks.com                                                   **|
|** ©2017 Trevelopment                                                       **|
|**                                                                          **|
|** build-tweaks.js - The main 'builder' component copys neccesary files to  **|
|** a temporary folder for copying to a usb additionaly                      **|
|** gives the option to copy files directly to an available usb drive.       **|
|**                                                                          **|
|** ************************************************************************ **|
\* ************************************************************************** */
/* jshint esversion:6 */
/* jshint -W033 */
var approot
if (isDev) {
  approot = './app/'// for dev
} else {
  approot = app.getAppPath()// for dist
}
var builddir = `${approot}/files/tweaks/`// Location of tweak files (as .txt files)
var extradir = app.getPath('userData')// Location of downloaded tweak files (userData)
var logFileName = 'MZD_LOG'// Name of log file (without extension)
var varDir = `${extradir}/background/` // Location of files with saved variables
const appender = require('appender')// Appends the tweak files syncronously
const crlf = require('crlf')// Converts line endings (from CRLF to LF)
const copydir = require('copy-dir')// Copys full directories
const drivelist = require('drivelist')// Module that gets the list of available USB drives
const extract = require('extract-zip')// For Unzipping
const mkdirp = require('mkdirp')// Equiv of Unix command mkdir -p
const rimraf = require('rimraf')// Equiv of Unix command rm -rf
// First line of AIO log
var AIO_LOG = `# __MZD-AIO-TI__ ${app.getVersion()}| MZD All In One Tweaks Installer\n#### AIO COMPILATION LOG - ${Date()}\r\n___\n- *START!*\n`
var AIO_LOG_HTML = `<button class="w3-btn w3-hover-teal w3-display-bottomright w3-margin" onclick="saveAIOLogHTML()">Save Log (HTML)</button><div id="aio-comp-log" class="aio-comp-log"><h1><b>MZD-AIO-TI ${app.getVersion()}</b> | MZD All In One Tweaks Installer</h1><br><h4> AIO COMPILATION LOG - ${Date()}</h4><hr><div><ul><li><b><i>START!</i></b></li>`
var userView = document.getElementById(`userLogView`)
var fileCount = 0 // Number of files in the Queue
var opsComplete = false // Flag to signal writing of tweaks.sh file is completed
var filesComplete = true // Flag to signal the files have all been copied
var disclaimerAndAudioFlag = false // Flag to prevent disclaimer&audiosource folder from being copied twice
var errFlag = false // Error flag
var copySwapfile = false // Swapfile flag
var speedcamPatchFlag = false // Speedcam Patch flag
var tweaks2write = [] // Queue for order consistantcy writing tweaks.sh (Always starts with 00_intro.txt)
var tmpdir = path.normalize(path.join(persistantData.get('copyFolderLocation'), '_copy_to_usb')) // Place to hold USB drive files before copying
var themeColor = 'Red'
/*                                      *********\
|*  START BUILD OF TWEAKS.SH & ASSOCIATED FILES *|
\**********                                     */
function buildTweakFile (user) {
  /* Set _copy_to_usb folder location */
  tmpdir = path.normalize(path.join(persistantData.get('copyFolderLocation'), '_copy_to_usb'))
  /* Start building tweaks.sh */
  tweaks2write = [`${builddir}00_intro.txt`]
  /* * Add Variables * */
  tweakVariables(user)
  tweaks2write.push(`${builddir}00_start.txt`)
  /* Start Writing Log Files */
  AIO_LOG += `- Tweak Files Location: ${tmpdir}\r\n`
  AIO_LOG_HTML += `<li><b>Tweak Files Location: ${tmpdir}</b></li>`
  /* Attach Hints */
  // $('body').append(`<div class="w3-display-middle" data-hint="Hint: You can change the location of the _copy_to _usb folder by right-clicking the MZD-AIO-TI tray icon." data-hintPosition="top-middle" data-position="bottom-middle-aligned"></div><div class="w3-display-right" data-hint="Hint: After installing the Background Rotator Tweak, you can change your joined background multiple times without reinstalling. Changing back to a single background without uninstalling Background Rotator will show the background for 1 minute, then black for the other 9 minutes." data-hintPosition="top-left" data-position="bottom-right-aligned"  style="right:15%"></div><div class="w3-display-left" data-hint="Hint: Insert a USB Drive before the build finishes to copy directly to USB." data-hintPosition="top-right" data-position="bottom-left-aligned" style="left:15%"></div>`)
  /* Building Dialog */
  bootbox.dialog({
    message: `<div style='text-align:center;'>${langObj.popupMsgs[0].msg}<br><div id='userLogView' style='text-align:center;' ></div><br><img class='loader' src='./files/img/load-1.gif' alt='...' /></div><div id='copy-loc'>${langObj.popupMsgs[1].msg}: ${tmpdir}<span class="w3-close icon-x w3-right" onclick="$(this).parent().hide()"></span></div>`,
    closeButton: false
  })
  persistantData.set('keepBackups', user.backups.org)
  persistantData.set('testBackups', user.backups.test)
  if (fs.existsSync(`${tmpdir}`)) {
    aioLog('Delete old _copy_to_usb folder...')
    try {
      // delete tmp folder if it exists and make new tmpdir
      rimraf.sync(`${tmpdir}`)
    } catch (e) {
      let m = `${e} - Leaving the '_copy_to_usb' folder open is most likely the cause of this error. Try closing all other running programs and folders before compiling.`
      aioLog(m, m)
      finishedMessage()
      return
    }
  }
  try {
    mkdirp.sync(`${tmpdir}/config/`)
    mkdirp.sync(`${tmpdir}/config_org/`)
  } catch (e) {
    m = `${e} - Leaving the '_copy_to_usb' folder open is most likely the cause of this error. Try closing all other running programs and folders before compiling.`
    aioLog(e.message, m)
    finishedMessage()
    return
  }
  if (user.restore.full) {
    fullSystemRestore()
    return
  }
  if (user.casdk.inst || user.casdk.uninst) {
    buildCASDK(user)
    return
  }
  // first back up JCI folder if chosen
  if (user.mainOps.indexOf(1) !== -1) {
    addTweak('00_backup.txt')
  }
  if (user.mainOps.indexOf(0) !== -1 || user.options.indexOf(8) !== -1) {
    addTweak('00_wifi.txt')
  }
  if (user.mainOps.indexOf(4) !== -1 || user.options.indexOf(8) !== -1) {
    addTweak('00_sshbringback.txt')
    addTweakDir('ssh_bringback', true)
  }
  if (user.options.indexOf(16) !== -1) {
    mkdirp.sync(`${tmpdir}/config/blank-album-art-frame/jci/gui/common/images/`)
    addTweakDir('blank-album-art-frame', true)
  }
  if (user.options.indexOf(123) !== -1) {
    addTweak('23_speedcam-u.txt')
    copydir(`${extradir}/org`, `${tmpdir}/config_org/speedcam-patch`, function (err) {
      if (err) {
        aioLog(`File Copy Error: Speedcam Patch`, `Speedcam Patch`)
      } else {
        aioLog(`Files for Uninstall Speedcam Patch copied successfully!`)
      }
    })
  }
  /* if (user.options.indexOf(23) !== -1) {  // Put this higher to give more time to copy. it needs to be patched as well
    if (!fs.existsSync(`${extradir}/speedcam-patch/`)) {
      window.alert('Please Download Speed Cam Patch Files Before Compiling')
      bootbox.hideAll()
      return
    } else {
      if (!fs.existsSync(`${extradir}/speedcam-patch/jci/nng/jci-linux_imx6_volans-release.org.59.00.443C-EU`)) {
        aioLog('Preparing Speedcam Files For Patching')
        copydir(`${builddir}/config/speedcam-patch`, `${extradir}/speedcam-patch`, function (err) {
          if (err) { aioLog(err, err) }
          copydir(`${builddir}/config_org/speedcam-patch`, `${extradir}/org/speedcam-patch`, function (err) {
            if (err) { aioLog(err, err) }
            speedcamPatch(user)
          })
        })
      } else {
        speedcamPatch(user)
      }
    }
  } else {
    speedcamIsPatched(user)
  } */
  speedcamIsPatched(user)
}
/* function speedcamPatch (user) {
  aioLog('Preparing Speedcam Files For Patching')
  copydir(`${extradir}/speedcam-patch/`, `./resources/speedcam-patch/`, function (err) {
    if (err) { aioLog(err, err) }
    copydir(`${extradir}/org/`, `./resources/org/`, function (err) {
      if (err) { aioLog(err, err) }
      aioLog('Patching Speedcam Files')
      speedcamPatchFlag = true
      const spawn = require('child_process').spawn
      var patchTool = `cd resources/tools/ && NNG_Patch.bat`
      const bat = spawn('cmd.exe', ['/c', patchTool])

      bat.stdout.on('data', (data) => {
        var strdata = String.fromCharCode.apply(null, data)
        aioLog(strdata)
      })

      bat.stderr.on('data', (data) => {
        var strdata = `${String.fromCharCode().apply(null, data)}<br />Error Patching Speedcam Files`
        aioLog(strdata, strdata)
      })

      bat.on('exit', (code) => {
        if (`${code}` === 0) {
          aioLog('Speedcam Files Patched Successfully ') // 0: Successful
        } else {
          aioLog(`Speedcam Patch Exit Code: ${code}`)
        }
        fs.rename(`./resources/speedcam-patch`, `${tmpdir}/config/speedcam-patch`) // Move Patched Files to tmpdir
        //fs.rename(`./resources/MZD_PATCH_LOG.txt`, `${tmpdir}`) // Move MZD Patch Log File to tmpdir
        speedcamIsPatched(user)
      })
    })
  })
}
*/

/* Check For Color Scheme Tweak */
function speedcamIsPatched (user) {
  if (user.mainOps.indexOf(3) !== -1) {
    if (user.colors > 16) {
      customTheme(themeColor, user)
    } else if (user.colors < 8 || user.colors === 11) { // 11 for CarOS theme
      setColor(themeColor, user)
    } else {
      setTheme(themeColor, user)
    }
  } else {
    buildTweak(user)
  }
}
function customTheme (color, user) {
  if (user.customTheme) {
    if (user.customTheme[0].substr(user.customTheme.length - 4) === 'jci') {
      aioLog(`Copying ${user.customTheme} Theme Folder`)
      copydir(`${user.customTheme}`, `${tmpdir}/config/color-schemes/theme/jci/`, function (stat, filepath, filename) {
        if (stat === 'file' && path.extname(filepath) !== '.png') {
          return false
        }
        return true
      }, function (err) {
        if (err) { aioLog(err, err) } else { aioLog(`Custom Theme Copied Successfully.`) }
        buildTweak(user)
      })
    } else {
      aioLog(`ERROR: INVALID THEME FOLDER`, `ERROR: INVALID THEME FOLDER: ${user.customTheme[0].substr(user.customTheme.length - 4)}   Please Select a 'jci' Folder To Use Custom Theme`)
    }
  } else {
    aioLog(`Custom theme not found, Copy the jci folder from a MZD Theme Package to '/config/color-schemes/theme/' To Use Your Theme`)
    mkdirp.sync(`${tmpdir}/config/color-schemes/theme/jci/`)
    buildTweak(user)
  }
}
function setTheme (color, user) {
  aioLog(`Unzipping ${color} Theme Folder`)
  extract(`${builddir}/config/themes/${color}.zip`, {dir: `${tmpdir}/config/color-schemes/theme/`}, function (err) {
    if (err) { aioLog(err, err) }
    aioLog(`${color} Theme Folder Unzipped & Added.`)
    buildTweak(user)
  })
}
function setColor (color, user) {
  fs.mkdirSync(`${tmpdir}/config/color-schemes`)
  copydir(`${extradir}/color-schemes/speedometer/`, `${tmpdir}/config/color-schemes/speedometer`, function (err) {
    if (err) { aioLog(err, err) }
    aioLog('Speedometer Color Files Copied')
  })
  aioLog(`Unzipping ${color} color theme folder`)
  extract(`${extradir}/color-schemes/${color}/jci.zip`, {dir: `${tmpdir}/config/color-schemes/${color}`}, function (err) {
    if (err) { aioLog(err, err) }
    aioLog(`${color} Color Scheme Folder Unzipped... Continue Build.`)
    if (user.colors === 1) {
      fs.createReadStream(`${extradir}/color-schemes/Blue/_skin_jci_bluedemo.zip`).pipe(fs.createWriteStream(`${tmpdir}/config/color-schemes/Blue/_skin_jci_bluedemo.zip`))
      aioLog(`Copying Blue Color Scheme For Navigation`)
    }
    if (!user.useColorBG) {
      if (fs.existsSync(`${tmpdir}/config/color-schemes/${color}/jci/gui/common/images/background.png`)) {
        fs.unlinkSync(`${tmpdir}/config/color-schemes/${color}/jci/gui/common/images/background.png`)
      }
      aioLog('Removed Color Scheme Background')
    }
    buildTweak(user)
  })
}
function buildTweak (user) {
  // ****************************************************/
  // **********Write uninstalls first********************/
  // ****************************************************/
  if (user.options.indexOf(101) !== -1) {
    addTweak('01_touchscreen-u.txt')
  }
  if (user.options.indexOf(102) !== -1) {
    addTweak('02_disclaimer-u.txt')
    addTweakDir('audio_order_AND_no_More_Disclaimer', false)
    disclaimerAndAudioFlag = true
  }
  if (user.options.indexOf(103) !== -1) {
    addTweak('03_warning-u.txt')
    addTweakDir('safety-warning-reverse-camera', false)
  }
  if (user.options.indexOf(104) !== -1) {
    addTweak('04_sensor-u.txt')
    addTweakDir('transparent-parking-sensor', false)
  }
  if (user.options.indexOf(105) !== -1) {
    addTweak('05_mainloop-u.txt')
    addTweakDir('main-menu-loop', false)
  }
  if (user.options.indexOf(106) !== -1) {
    addTweak('06_listloop-u.txt')
    addTweakDir('list-loop', false)
  }
  if (user.options.indexOf(107) !== -1) {
    if (user.options.indexOf(106) === -1) {
      addTweak('07_shorterdelay-u.txt')
    }
  }
  if (user.options.indexOf(108) !== -1) {
    addTweak('08_orderflac-u.txt')
    addTweakDir('media-order-patching', false)
  }
  if (user.options.indexOf(109) !== -1) {
    addTweak('09_audioorder-u.txt')
    if (!disclaimerAndAudioFlag) {
      addTweakDir('audio_order_AND_no_More_Disclaimer', false)
    }
  }
  if (user.options.indexOf(110) !== -1) {
    addTweak('10_pausemute-u.txt')
    addTweakDir('pause-on-mute', false)
  }
  if (user.options.indexOf(111) !== -1) {
    addTweak('11_msgreplies-u.txt')
    addTweakDir('message_replies', false)
  }
  if (user.options.indexOf(112) !== -1) {
    addTweak('12_diag-u.txt')
  }
  if (user.options.indexOf(113) !== -1) {
    addTweak('13_boot-u.txt')
    addTweakDir('bootanimation', false)
  }
  if (user.options.indexOf(114) !== -1) {
    addTweak('14_bgart-u.txt')
    addTweakDir('bigger-album-art', false)
  }
  if (user.options.indexOf(115) !== -1) {
    addTweak('15_btnbackground-u.txt')
    addTweakDir('NoButtons', false)
  }
  if (user.options.indexOf(116) !== -1) {
    addTweak('16_blnkframe-u.txt')
    addTweakDir('blank-album-art-frame', false)
  }
  if (user.options.indexOf(117) !== -1) {
    addTweak('17_videoplayer-u.txt')
  }
  if (user.options.indexOf(118) !== -1) {
    addTweak('18_swapfile-u.txt')
  }
  if (user.options.indexOf(119) !== -1) {
    addTweak('19_speedo-u.txt')
    addTweakDir('speedometer', false)
  }
  if (user.options.indexOf(122) !== -1) {
    addTweak('22_fuel-u.txt')
    addTweakDir('FuelConsumptionTweak', false)
  }
  if (user.options.indexOf(124) !== -1) {
    addTweak('24_castscreen-u.txt')
  }
  if (user.options.indexOf(125) !== -1) {
    addTweak('25_androidauto-u.txt')
    addTweakDir('androidauto', false)
  }
  if (user.options.indexOf(126) !== -1) {
    addTweak('26_usbaudiomod-u.txt')
    addTweakDir('USBAudioMod', false)
  }
  if (user.mainOps.indexOf(106) !== -1) {
    addTweak('00_bgrotator-u.txt')
    addTweakDir('BackgroundRotator', false)
  }
  // reset flag for installs
  disclaimerAndAudioFlag = false
  // ****************************************************/
  // ******************Write Installs********************/
  // ****************************************************/
  if (user.mainOps.indexOf(3) !== -1) {
    if (user.colors === 0) {
      addTweak('21_colors-u.txt')
    } else if (user.colors < 8 || user.colors === 11) {
      addTweak('21_colors-i1.txt')
      addTweak('21_colors-i2.txt')
    } else {
      addTweak('21_theme-i.txt')
    }
  }
  if (user.options.indexOf(1) !== -1) {
    addTweak('01_touchscreen-i.txt')
  }
  if (user.options.indexOf(2) !== -1) {
    if (user.disclaimOps === 1) {
      addTweak('02_disclaimer5-i.txt')
    } else {
      addTweak('02_disclaimer-i.txt')
      addTweakDir('audio_order_AND_no_More_Disclaimer', true)
    }
    disclaimerAndAudioFlag = true
  }
  if (user.options.indexOf(3) !== -1) {
    addTweak('03_warning-i.txt')
    addTweakDir('safety-warning-reverse-camera', true)
  }
  if (user.options.indexOf(4) !== -1) {
    addTweak('04_sensor-i.txt')
    addTweakDir('transparent-parking-sensor', true)
  }
  if (user.options.indexOf(5) !== -1) {
    addTweak('05_mainloop-i.txt')
    addTweakDir('main-menu-loop', true)
  }
  if (user.options.indexOf(6) !== -1) {
    addTweak('06_listloop-i.txt')
    addTweakDir('list-loop', true)
  }
  if (user.options.indexOf(7) !== -1) {
    addTweak('07_shorterdelay-i.txt')
  }
  if (user.listbeep) {
    addTweak('07_listbeep-i.txt')
  }
  if (user.options.indexOf(8) !== -1) {
    addTweak('08_orderflac-i.txt')
    addTweakDir('media-order-patching', true)
  }
  if (user.options.indexOf(9) !== -1) {
    addTweak('09_audioorder-i.txt')
    if (!disclaimerAndAudioFlag) {
      addTweakDir('audio_order_AND_no_More_Disclaimer', true)
    }
  }
  if (user.options.indexOf(10) !== -1) {
    addTweak('10_pausemute-i.txt')
    addTweakDir('pause-on-mute', true)
  }
  if (user.options.indexOf(19) !== -1) {
    addTweak('19_speedo-i1.txt', true)
    if (user.speedoOps.lang.id === 0) {
      addTweak('19_speedo-english.txt', true)
    } else if (user.speedoOps.lang.id === 2) {
      addTweak('19_speedo-spanish.txt', true)
    } else if (user.speedoOps.lang.id === 3) {
      addTweak('19_speedo-polish.txt', true)
    } else if (user.speedoOps.lang.id === 4) {
      addTweak('19_speedo-slovic.txt', true)
    } else if (user.speedoOps.lang.id === 5) {
      addTweak('19_speedo-turkish.txt', true)
    } else if (user.speedoOps.lang.id === 6) {
      addTweak('19_speedo-french.txt', true)
    } else if (user.speedoOps.lang.id === 7) {
      addTweak('19_speedo-italian.txt', true)
    }
    if (user.speedoOps.xph.id === 10) {
      addTweak('19_speedo-mph.txt', true)
    }
    if (user.speedoOps.modAlt) {
      addTweak('19_speedo-analog.txt', true)
    }
    if (user.speedoOps.sml.id === 21) {
      addTweak('19_speedo-small_speedo_on_vehicle.txt', true)
    } else if (user.speedoOps.sml.id === 22) {
      addTweak('19_speedo-small_speedo_off.txt', true)
    }
    if (user.speedoOps.bg.id === 30) {
      addTweak('19_speedo-own_background.txt', true)
    } else if (user.speedoOps.bg.id === 31) {
      addTweak('19_speedo-old_background.txt', true)
    }
    addTweak('19_speedo-i2.txt', true)
    addTweakDir('speedometer', true)
    if (user.speedoOps.mod) {
      addTweak('19_speedo_variant-i.txt', true)
      addTweakDir('speedometer_mod', true)
    }
  }
  /* SPEEDCAM PATCH IS REMOVED DUE TO DMCA TAKEDOWN
  if (user.options.indexOf(23) !== -1) {
    addTweak('23_speedcam-i.txt')
    if (user.speedcamOps === 0) {
      addTweak('23_speedcam-a.txt')
    } else if (user.speedcamOps === 1) {
      addTweak('23_speedcam-b.txt')
    } else if (user.speedcamOps === 2) {
      addTweak('23_speedcam-c.txt')
    } else if (user.speedcamOps === 3) {
      addTweak('23_speedcam-e.txt')
    } else if (user.speedcamOps === 4) {
      addTweak('23_speedcam-f.txt')
    } else if (user.speedcamOps === 5) {
      addTweak('23_speedcam-g.txt')
    }
  }*/
  if (user.options.indexOf(24) !== -1) {
    addTweak('24_castscreen-i.txt')
    addTweakDir('castscreen-receiver', true)
  }
  if (user.options.indexOf(25) !== -1) {
    if (user.aaVer === 0) {
      addTweak('25_androidauto-v99-i.txt')
      addTweakDir('androidauto-v99', true)
      fs.createReadStream(`${builddir}/config/androidauto-v99/AA99-README.txt`).pipe(fs.createWriteStream(`${tmpdir}/AA99-README.txt`))
    } else {
      addTweak('25_androidauto-i.txt')
      addTweakDir('androidauto', true)
    }
    addTweakDir('androidauto', false)
  }
  if (user.options.indexOf(11) !== -1) {
    addTweak('11_msgreplies-i.txt')
    addTweakDir('message_replies', true)
  }
  if (user.options.indexOf(12) !== -1) {
    addTweak('12_diag-i.txt')
  }
  if (user.options.indexOf(13) !== -1) {
    addTweak('13_boot-i.txt')
    addTweakDir('bootanimation', true)
  }
  if (user.options.indexOf(26) !== -1) {
    addTweak('26_usbaudiomod-i.txt') // USB Audio Mod Install comes before Bigger Album Art
    addTweakDir('USBAudioMod', true)
  }
  if (user.options.indexOf(14) !== -1) {
    addTweak('14_bgart-i.txt')
    addTweakDir('bigger-album-art', true)
  }
  if (user.options.indexOf(15) !== -1) {
    addTweak('15_btnbackground-i.txt')
    addTweakDir('NoButtons', true)
  }
  if (user.options.indexOf(17) !== -1) {
    addTweak('17_videoplayer-i.txt')
    addTweakDir('videoplayer', true)
  }
  /*  TODO: Fuel Consumptoion Tweak - Think of a better way to pick MPG or Km/L (Like a variable) */
  if (user.options.indexOf(22) !== -1) {
    if (user.fuelOps === 1) {
      addTweak('22_fuelMPG-i.txt')
    } else {
      addTweak('22_fuel-i.txt')
    }
    addTweakDir('FuelConsumptionTweak', true)
  }
  // Statusbar Tweaks
  if (user.options.indexOf(120) !== -1) {
    addTweak('20_date-u.txt')
    addTweakDir('date-to-statusbar_mod', false)
  } else if (user.options.indexOf(20) !== -1) {
    if (user.statusbar.d2sbuninst) {
      addTweak('20_date2status-u.txt')
      addTweakDir('date-to-statusbar_mod', false)
    } else if (user.statusbar.d2sbinst) {
      if (user.d2sbOps === 0) {
        addTweak('20_date-iv1.txt')
      } else {
        addTweak('20_date-iv3.3.txt')
      }
      addTweakDir('date-to-statusbar_mod', true)
    }
    if (user.statusbar.uninst) {
      addTweak('20_statusbar_tweaks-u.txt')
    } else {
      addTweak('20_statusbar_tweaks-i.txt')
    }
  }
  if (user.uistyle.uninst) {
    addTweak('20_uistyle-u.txt')
  } else if (user.mainOps.indexOf(9) !== -1) {
    addTweak('20_uistyle-i.txt')
  }
  if (user.uistyle.uninstmain) {
    addTweak('20_mainmenu-u.txt')
  } else if (user.mainOps.indexOf(8) !== -1) {
    addTweak('20_mainmenu-i.txt')
  }
  if (user.options.indexOf(16) !== -1) {
    var outStr = fs.createWriteStream(`${tmpdir}/config/blank-album-art-frame/jci/gui/common/images/no_artwork_icon.png`)
    var inStr = fs.createReadStream(`${varDir}/no_artwork_icon.png`)
    outStr.on('close', function () {
      aioLog('Blank Album Art Copy Successful!')
    })
    inStr.pipe(outStr)
    addTweak('16_blnkframe-i.txt')
  }
  // Off Screen Background
  if (user.mainOps.indexOf(10) !== -1 || user.mainOps.indexOf(110) !== -1) {
    var inStrOff
    if (user.mainOps.indexOf(10) !== -1) {
      inStrOff = fs.createReadStream(`${varDir}/OffScreenBackground.png`)
      addTweak('00_offbackground-i.txt')
    } else {
      inStrOff = fs.createReadStream(path.resolve(app.getAppPath(),'../background-images/default/OffScreenBackground.png'))
      addTweak('00_offbackground-u.txt')
    }
    var outOff = fs.createWriteStream(`${tmpdir}/config/OffScreenBackground.png`, {flags: 'w'})
    outOff.on('close', function () {
      aioLog('Off Screen Background Copy Successful!')
    })
    inStrOff.pipe(outOff)
  }
  // Add chosen background
  if (user.mainOps.indexOf(2) !== -1) {
    if (user.mainOps.indexOf(6) !== -1) {
      addTweak('00_bgrotator-i.txt')
      addTweakDir('BackgroundRotator', true)
    }
    var inStrbg = fs.createReadStream(`${varDir}/background.png`)
    var out = fs.createWriteStream(`${tmpdir}/config/background.png`, {flags: 'w'})
    out.on('close', function () {
      aioLog('Background Copy Successful!')
    })
    inStrbg.pipe(out)
    addTweak('00_background.txt')
  }
  if (user.mainOps.indexOf(5) !== -1) {
    addTweak('00_sd-cid.txt')
    addTweakDir('get_sd_cid', true)
  }
  if (user.options.indexOf(19) !== -1 || user.options.indexOf(17) !== -1 || user.options.indexOf(25) !== -1) {
    addTweakDir('bin', true)
    addTweakDir('patch59', true)
  }
  // Swapfile tweak has to be last because the final operation
  //  in the script is to remove all of the other tweak files
  if (user.options.indexOf(18) !== -1) {
    copySwapfile = true
    addTweak('18_swapfile-i.txt')
  }
  // Finish with the end script
  addTweak('00_end.txt')
  // Add root files to tmp and write tweaks.sh
  addRootFiles()
  writeTweaksFile()
}
// function to add each tweak to the array
function addTweak (twk) {
  tweaks2write.push(`${builddir}${twk}`)
  twk = twk.substr(3)
  twk = twk.replace('.txt', '')
  twk = twk.replace('-i', ' Install ')
  twk = twk.replace('-u', ' Uninstall ')
  twk = twk.charAt(0).toUpperCase() + twk.slice(1)
  aioLog(`${twk} added successfully.`)
}
function writeTweaksFile () {
  // write stream writes tweaks.txt
  var tweaks = fs.createWriteStream(`${tmpdir}/tweaks.txt`)
  // file appender function is given the array and piped to the write stream
  new appender(tweaks2write).pipe(tweaks)
  tweaks.on('close', convert2LF)
}
function tweakVariables (user) {

  var bak = `KEEPBKUPS=`
  bak += (user.backups.org) ? `1\n` : `0\n`
  bak += `TESTBKUPS=`
  bak += (user.backups.org) ? `1\n` : `0\n`
  bak += `SKIPCONFIRM=`
  bak += (user.backups.skipconfirm) ? `1\n` : `0\n`
  bak += `ZIPBACKUP=`
  bak += (user.zipbackup) ? `1\n` : `0\n`
  bak += `FORCESSH=`
  bak += (user.forcessh) ? `1\n` : `0\n`
  fs.writeFileSync(`${varDir}/backups.txt`, bak)
  tweaks2write.push(`${varDir}/backups.txt`)

  if (user.restore.full) {
    bak = `DEL_BAKUPS=`
    bak += (user.restore.delBackups) ? `1\n` : `0\n`
    fs.writeFileSync(`${varDir}/restore.txt`, bak)
    tweaks2write.push(`${varDir}/restore.txt`)
  }


  if (user.mainOps.indexOf(6) !== -1) {
    tweaks2write.push(`${varDir}/bg-rotator.txt`)
  }
  if (user.mainOps.indexOf(3) !== -1) {
    if (user.colors === 0) {
      themeColor = 'Red'
    } else if (user.colors === 1) {
      themeColor = 'Blue'
    } else if (user.colors === 2) {
      themeColor = 'Green'
    } else if (user.colors === 3) {
      themeColor = 'Silver'
    } else if (user.colors === 4) {
      themeColor = 'Pink'
    } else if (user.colors === 5) {
      themeColor = 'Purple'
    } else if (user.colors === 6) {
      themeColor = 'Orange'
    } else if (user.colors === 7) {
      themeColor = 'Yellow'
    } else if (user.colors === 8) {
      themeColor = 'SmoothRed'
    } else if (user.colors === 9) {
      themeColor = 'SmoothAzure'
    } else if (user.colors === 10) {
      themeColor = 'SmoothViolet'
    } else if (user.colors === 11) {
      themeColor = 'CarOS'
    } else if (user.colors === 12) {
      themeColor = 'StormTroopers'
    } else if (user.colors === 13) {
      themeColor = 'Poker'
    } else if (user.colors === 14) {
      themeColor = 'Mazda'
    } else if (user.colors === 15) {
      themeColor = 'Floating'
    } else if (user.colors === 16) {
      themeColor = 'X-Men'
    } else if (user.colors === 17) {
      themeColor = 'Custom'
    } else {
      themeColor = 'Red'
    }
  }
  if (user.options.indexOf(13) !== -1) {
    var bootAnimations = `BOOTLOGO1=${user.boot.logo1}\n`
    bootAnimations += `BOOTLOGO2=${user.boot.logo2}\n`
    bootAnimations += `BOOTLOGO3=${user.boot.logo3}\n`
    fs.writeFileSync(`${varDir}/bootlogo.txt`, bootAnimations)
    tweaks2write.push(`${varDir}/bootlogo.txt`)
  }
  if (user.mainOps.indexOf(3) !== -1) {
    fs.writeFileSync(`${varDir}/color.txt`, `COLORTHEME=${themeColor}\n`)
    tweaks2write.push(`${varDir}/color.txt`)
  }
  if (user.options.indexOf(1) !== -1) {
    if (user.keepSpeedRestrict) {
      fs.writeFileSync(`${varDir}/touchscreen.txt`, `KEEP_SPEED_RESTRICT=1\n`)
    } else {
      fs.writeFileSync(`${varDir}/touchscreen.txt`, `KEEP_SPEED_RESTRICT=0\n`)
    }
    tweaks2write.push(`${varDir}/touchscreen.txt`)
  }
  if (user.mainOps.indexOf(8) !== -1) {
    var mmenu = `UI_STYLE_ELLIPSE=`
    mmenu += (user.uistyle.ellipse) ? `1\n` : `0\n`
    mmenu += `UI_STYLE_MINICOINS=`
    mmenu += (user.uistyle.minicoins) ? `1\n` : `0\n`
    mmenu += `UI_STYLE_MINIFOCUS=`
    mmenu += (user.uistyle.minifocus) ? `1\n` : `0\n`
    mmenu += `UI_STYLE_MAIN3D=`
    mmenu += `${user.uistyle.mainlabel}\n`
    mmenu += `UI_STYLE_ALTLAYOUT=`
    mmenu += `${user.uistyle.layout}\n`
    fs.writeFileSync(`${varDir}/mainmenu.txt`, mmenu)
    tweaks2write.push(`${varDir}/mainmenu.txt`)
  }
  if (user.mainOps.indexOf(9) !== -1) {
    var ui = `UI_STYLE_BODY=${user.uistyle.body}\n`
    ui += `UI_STYLE_LIST=${user.uistyle.listitem}\n`
    ui += `UI_STYLE_DISABLED=${user.uistyle.listitemdisabled}\n`
    ui += `UI_STYLE_TITLE=${user.uistyle.title}\n`
    ui += `UI_STYLE_RADIO=${user.uistyle.radio}\n`
    ui += `UI_STYLE_SHADOW=`
    ui += (user.uistyle.shadow) ? `"text-shadow: 2px 2px .5px #000;"\n` : `\n`
    fs.writeFileSync(`${varDir}/uistyle.txt`, ui)
    tweaks2write.push(`${varDir}/uistyle.txt`)
  }
  if (user.options.indexOf(15) !== -1) {
    var transbg = `NO_BTN_BG=`
    transbg += (user.uistyle.nobtnbg) ? `1\n` : `0\n`
    transbg += `NO_NP_BG=`
    transbg += (user.uistyle.nonpbg) ? `1\n` : `0\n`
    transbg += `NO_LIST_BG=`
    transbg += (user.uistyle.nolistbg) ? `1\n` : `0\n`
    transbg += `NO_CALL_BG=`
    transbg += (user.uistyle.nocallbg) ? `1\n` : `0\n`
    transbg += `NO_TEXT_BG=`
    transbg += (user.uistyle.notextbg) ? `1\n` : `0\n`
    fs.writeFileSync(`${varDir}/removebgs.txt`, transbg)
    tweaks2write.push(`${varDir}/removebgs.txt`)
  }
  if (user.options.indexOf(20) !== -1) {
    var dateFormat = user.d2sbOps - 1
    fs.writeFileSync(`${varDir}/d2sb.txt`, `DATE_FORMAT=${dateFormat}\n`)
    tweaks2write.push(`${varDir}/d2sb.txt`)
    var sc = `STATUS_BAR_APP=${user.statusbar.app}\n`
    sc += `STATUS_BAR_CLOCK=${user.statusbar.clock}\n`
    sc += `STATUS_BAR_NOTIF=${user.statusbar.notif}\n`
    sc += `STATUS_BAR_OPACITY=${user.statusbar.opacity}\n`
    sc += (user.statusbar.main) ? `STATUS_BAR_CTRL="background-image: none;"\nSBN_CTRL="background-image: none;"\n` : `STATUS_BAR_CTRL="background-image: url('../images/StatusBarBg.png');"\nSBN_CTRL=\n`
    fs.writeFileSync(`${varDir}/statusbar-color.txt`, sc)
    tweaks2write.push(`${varDir}/statusbar-color.txt`)
  }
  if (user.options.indexOf(19) !== -1 && user.speedoOps.bg.id === 30) {
    fs.writeFileSync(`${varDir}/bgopacity.txt`, `OPACITY=${user.speedoOps.opac}\n`)
    tweaks2write.push(`${varDir}/bgopacity.txt`)
  }
}
function convert2LF () {
  /* For now the files are pre converted, but this needs to stay in just in case EOL format changes.*********** */
  crlf.set(`${tmpdir}/tweaks.txt`, 'LF', function (err, endingType) {
    if (err) {
      aioLog(err, 'LF Convert Error')
    } else if (endingType === 'NA') {
      aioLog(`EOL => ${endingType} (Format should be: LF)`)
    } else if (endingType === 'LF') {
      aioLog(`EOL => ${endingType}`)
    } else if (endingType === 'CRLF') {
      aioLog(`EOL => ${endingType}`)
    } else {
      aioLog(`EOL FORMAT ${endingType} (Format should be: LF)`)
    }
    // if (err) aioLog(err,'LF Convert Error')throw err **********************
    // Rename tweaks.txt to tweaks.sh
    fs.renameSync(`${tmpdir}/tweaks.txt`, `${tmpdir}/tweaks.sh`)
    aioLog('Writing Tweaks.sh')
    opsComplete = true
    setTimeout(function () {
      if (filesComplete) {
        printAIOlog()
      }
    }, 5000)
  })
}
// Function for copying tweak folders
function addTweakDir (twk, inst) {
  filesComplete = false
  aioLog(`Copying ${twk} files...`)
  fileCount++
  var twkdir = '/config/'
  if (!inst) {
    twkdir = '/config_org/'
  }
  try {
    if (!fs.existsSync(`${tmpdir}${twkdir}${twk}`)) {
      fs.mkdirSync(`${tmpdir}${twkdir}${twk}`)
    }
    // console.log(`${approot}/files/tweaks/${twkdir}${twk}`)
    // Above creates, below copies to tmp
    copydir(`${builddir}${twkdir}${twk}`, `${tmpdir}${twkdir}${twk}`, function (err) {
      if (err) {
        aioLog(`File Copy Error: ${twk}-${err}`, `${err}-${twk}`)
      } else {
        aioLog(`Files for ${twk} copied successfully!`)
      }
      fileCount--
      if (fileCount === 0) {
        setTimeout(function () {
          if (fileCount === 0) {
            filesComplete = true
          }
          if (opsComplete) {
            printAIOlog()
          }
        }, 5000)
      }
    })
  } catch (e) {
    aioLog(e, e)
  }
}
// Function copys root files
function addRootFiles () {
  try {
    copydir(`${approot}/files/tweaks/root`, `${tmpdir}`, function (err) {
      if (err) {
        errFlag = true
        aioLog('ERROR COPYING ROOT FILES', err)
        throw (err)
      } else {
        aioLog('Root files copied successfully!')
      }
    })
  } catch (e) {
    aioLog(e, e)
  }
}
function aioLog (logMsg, err) {
  if (err) {
    errFlag = true
    window.alert(err, 'MZD-AIO-TI ERROR')
    AIO_LOG_HTML += `<li style='font-weight:600;color:red'> ${logMsg}</li>\n`
    printAIOlog()
  } else {
    AIO_LOG_HTML += `<li style='color:#004c00'> ${logMsg}</li>\n`
  }
  userView = document.getElementById(`userLogView`)
  if (userView) {
    userView.innerHTML = logMsg
  }
  console.log(logMsg)
  AIO_LOG += `- ${logMsg}\n`
}
// Prints out the log
function printAIOlog () {
  if (filesComplete && opsComplete || errFlag) {
    filesComplete = false
    opsComplete = false
    fs.writeFile(`${tmpdir}/${logFileName}.md`, AIO_LOG, {flag: 'w'}, (err) => {
      if (err) throw err
      console.log('AIO log saved!')
      fs.writeFile(path.resolve(path.join(`${approot}`, `../../${logFileName}.htm`)), AIO_LOG_HTML, {flag: 'w'}, (err) => {
        if (err) throw err
        console.log('AIO log saved! (HTML version)')
        bootbox.hideAll()
        if (!errFlag) {
          usbDrives()
        } else {
          finishedMessage()
        }
      })
    })
  }
}
function appendAIOlog (logMsg) {
  fs.writeFile(path.resolve(path.join(`${approot}`, `../../${logFileName}.htm`)), logMsg, {flag: 'a'}, (err) => {
    if (err) {
      console.log(err)
    } else {
      fs.writeFile(path.resolve(path.join(`${tmpdir}`, `${logFileName}.md`)), `- ${String(logMsg).replace(/<[^>]+>/gm, '')}`, {flag: 'a'}, (err) => {
        if (err) {
          console.log(`Log File has been moved: ${err}`)
        }
      })
    }
  })
}
// Returns the available usb drives
function usbDrives () {
  var disks = []
  var usbDriveLst = []
  drivelist.list((error, dsklst) => {
    if (error) {
      bootbox.alert({
        title: 'Error Locating Available USB Drives',
        message: `<b>Build has completed successfully</b> although USB drives cannot be found because of an error. This can occur when the filepath to user appdata (${app.getPath('appData')}) contains special characters such as &, %, *, etc.  <br><br>${error}`,
        callback: function () {
          bootbox.hideAll()
          finishedMessage()
        }
      })
      appendAIOlog(`Error finding USB drives: ${error}`)
    }
    dsklst.forEach((drive) => {
      if (!drive.system) {
        disks.push({'desc': drive.description, 'mp': `${drive.mountpoints[0].path}`})
        usbDriveLst.push({'text': `<span class='icon-usb'></span> ${drive.mountpoints[0].path} ${drive.description.replace(' USB Device', '')}`, 'value': drive.mountpoints[0].path})
      }
    })
    introJs().hideHints()
    var usb = disks
    var lst = ''
    if (usb.length < 1) {
      appendAIOlog(`<li style='color:#520086'>No USB Drives Found</li>`)
      unzipSwapfile(null)
    } else if (usb.length > 1) {
      lst += `<h2><b>${usb.length} ${langObj.popupMsgs[6].msg}:</b></h2>`
      var usbuttons = ''
      for (var j = 0; j < usb.length; j++) {
        lst += `<h4> ${usb[j].mp} ${usb[j].desc} `
        lst += `<button class="w3-round-large w3-btn w3-ripple w3-hover-green w3-medium" title='${langObj.popupMsgs[5].msg} ${usb[j].mp}' onclick="shell.showItemInFolder('${usb[j].mp}')"></span><span class="icon-usb2"></span> ${langObj.popupMsgs[5].msg} ${usb[j].mp}</button></h4>`
        appendAIOlog(`<li style='color:#005182'>Found USB Drive #${j + 1} - ${usb[j].mp} ${usb[j].desc}</li>`)
      }
      lst += `<h5><b>${langObj.popupMsgs[8].msg}:</b></h5>${langObj.popupMsgs[2].msg}`
      lst += usbuttons
      lst += `<label class="delCopyMultiLabel w3-display-bottomleft"><input type="checkbox" class="w3-check" id="rmCpDirCheck">${langObj.popupMsgs[21].msg}</label>`
      bootbox.prompt({
        title: lst,
        inputType: 'select',
        inputOptions: usbDriveLst,
        buttons: {
          confirm: {
            label: `<span class='icon-usb'></span> ${langObj.popupMsgs[3].msg}`
          },
          cancel: {
            label: `<span class='icon-x'></span> ${langObj.popupMsgs[4].msg}`
          }
        },
        callback: function (result) {
          if (!result) {
            unzipSwapfile(null)
          } else {
            persistantData.set('delCopyFolder', $('#rmCpDirCheck').prop('checked'))
            copyToUSB(result)
          }
        }
      })
      $('#rmCpDirCheck').prop('checked', persistantData.get('delCopyFolder'))
    } else if (usb.length === 1) {
      lst = `<h2><b>${langObj.popupMsgs[6].msg}: </b></h2>`
      for (var k = 0; k < usb.length; k++) {
        lst += `<h4><b>${usb[k].mp} ${usb[k].desc}</b></h4>`
        appendAIOlog(`<li style='color:#005182'>USB Drive - ${usb[k].mp} ${usb[k].desc}</li>`)
      }
      lst += `<b>${langObj.popupMsgs[7].msg} ${usb[0].mp.replace(':', '')}?</b><br>${langObj.popupMsgs[2].msg}`
      lst += `<button class="w3-round-xlarge w3-grey w3-btn w3-ripple w3-hover-blue w3-large w3-display-bottomleft" style="margin-bottom: -50px;margin-left: 10px;" title='${langObj.popupMsgs[5].msg}' onclick="shell.showItemInFolder('${usb[0].mp}')"></span><span class="icon-usb3"></span> ${langObj.popupMsgs[5].msg}</button>`
      lst += `<label class="delCopyLabel w3-display-bottomright"><input type="checkbox" id="rmCpDirCheck" class="w3-check">${langObj.popupMsgs[21].msg}</label>`
      bootbox.confirm({
        title: `Copy files to USB drive?`,
        message: lst,
        buttons: {
          confirm: {
            label: `<span class='icon-usb'></span> ${langObj.popupMsgs[3].msg}`
          },
          cancel: {
            label: `<span class='icon-x'></span> ${langObj.popupMsgs[4].msg}`
          }
        },
        callback: function (result) {
          if (!result) {
            unzipSwapfile(null)
          } else {
            persistantData.set('delCopyFolder', $('#rmCpDirCheck').prop('checked'))
            copyToUSB(usb[0].mp)
          }
        }
      })
      $('#rmCpDirCheck').prop('checked', persistantData.get('delCopyFolder'))
      return usb
    }
  })
}
function noUsbDrive () {
  bootbox.hideAll()
  bootbox.alert({
    title: `<h2>Compilation Finished!</h2>`,
    message: `${langObj.popupMsgs[9].msg} ${tmpdir} ${langObj.popupMsgs[10].msg}. <br><button href='' class='w3-round w3-black w3-btn w3-ripple nousbbutton' title='Copy These Files To A Blank USB Drive' onclick='openCopyFolder()'>${langObj.menu.copytousb.toolTip}</button>`,
    callback: function () { finishedMessage() }
  })
  appendAIOlog(`<li style='color:#4a0dab'>To Install Tweak Files: Copy Entire Contents of "_copy_to_usb" Onto USB Drive.</li><li style='color:#1a0dab'>Location:<a href='' onclick='openCopyFolder()'><u> ${tmpdir}</u></a></li>`)
}
function copyToUSB (mp) {
  var copyingUSB = bootbox.dialog({
    message: `<div class='w3-center'><h3>${langObj.popupMsgs[11].msg} ${mp}...  ${langObj.popupMsgs[12].msg}...</h3><br><div id='userLogView' style='text-align:center;' ></div><br><img class='loader' src='./files/img/load-0.gif' alt='...' /></div>`,
    closeButton: false
  })
  try {
    copydir(tmpdir, mp, function (err) {
      if (err) {
        showNotification('Error Copying Files to USB', 'Unable to copy files to USB drive', 13)
        window.alert(err, 'Error: Unable to copy files to USB drive')
        appendAIOlog(`<li style='color:#ff0000'>${err} Unable To Copy Files To USB Drive</li>`)
        errFlag = true
        finishedMessage()
      } else {
        appendAIOlog(`<li style='color:#002200;font-weight:800;'>Files Copied to USB Drive ${mp.replace(':', '')}.</li>`)
        copyingUSB.hide()
        unzipSwapfile(mp)
      }
    })
  } catch (error) {
    bootbox.hideAll()
    window.alert(`${error}Copying to USB error`)
    appendAIOlog(`<li style='color:#ff0000'>${err} Unable To Copy Files To USB Drive</li>`)
  }
}
function unzipSwapfile (dest) {
  var nocopy = false
  if (!dest) {
    nocopy = true
    dest = `${tmpdir}`
  }
  if (copySwapfile) {
    copySwapfile = false
    appendAIOlog(`<li style='color:#005182'>${langObj.popupMsgs[13].msg}: ${dest.replace(':', '')}</li>`)
    var swapMsg = bootbox.dialog({
      message: `<div class='w3-center'><h3>${langObj.popupMsgs[13].msg}: ${dest.replace(':', '')}...  ${langObj.popupMsgs[12].msg}... </h3><br><div id='swapLogView' style='text-align:center;' ></div><br><img class='loader' src='./files/img/load-0.gif' alt='...' /></div>`,
      closeButton: false
    })
    setTimeout(function () {
      if (document.getElementById('swapLogView')) {
        document.getElementById('swapLogView').innerHTML += `\n\n${langObj.popupMsgs[14].msg}`
      }
    }, 10000)
    setTimeout(function () {
      if (document.getElementById('swapLogView')) {
        document.getElementById('swapLogView').innerHTML += `\n\n${langObj.popupMsgs[15].msg}`
      }
    }, 35000)
    setTimeout(function () {
      if (document.getElementById('swapLogView')) {
        document.getElementById('swapLogView').innerHTML = `${langObj.popupMsgs[16].msg}:<br>${langObj.tweakOps[17].toolTip}`
      }
    }, 40000)
    try {
      fs.mkdirSync(`${dest}/config/swapfile/`)
    } catch (e) {
      appendAIOlog(`<li style='color:#ff0000'>${e} Swapfile Already Exists, Overwriting...</li>`)
    }
    extract(`${approot}/files/tweaks/config/swapfile/swapfile.zip`, {dir: `${dest}/config/swapfile/`}, function (err) {
      if (err) {
        appendAIOlog(`<li style='color:#ff0000'>${err} Swapfile Error</li>`)
        console.error(err, err)
      }
      appendAIOlog(`<li style='color:#005182'>Swapfile Unzipped.</li>`)
      swapMsg.modal('hide')
      if (nocopy) {
        noUsbDrive()
      } else {
        finishedMessage(dest)
      }
    })
  } else {
    if (nocopy) {
      noUsbDrive()
    } else {
      finishedMessage(dest)
    }
  }
}
var strtOver = `<button class="w3-round-xlarge w3-btn w3-ripple w3-large w3-hover-white w3-border-black" onclick="location.reload()"><span class="icon-space-shuttle"></span>     ${langObj.popupMsgs[17].msg}</button>`
var viewLog = `<button class="w3-round-xlarge w3-indigo w3-btn w3-ripple w3-hover-cyan w3-large w3-border-black view-log" title='Compile Log' onclick="$('#opn-mzd-log').click()"><span class='icon-star-full'></span>   ${langObj.popupMsgs[18].msg}</button>`
var closeApp = `<button class="w3-round-xlarge w3-red w3-btn w3-ripple w3-hover-lime w3-large w3-border-black" title="Close The App" onclick="window.close()"><span class="icon-exit"></span>    ${langObj.popupMsgs[19].msg}</button>`
var cp2usb = `<button class="w3-round-xlarge w3-teal w3-btn w3-ripple w3-hover-pink w3-large w3-border-black" style="letter-spacing:1px" title="Copy These Files To A Blank USB Drive" onclick="openCopyFolder()"><span class="icon-copy2"></span> ${langObj.menu.copytousb.toolTip}</button>`
var saveBtn = `<button class="w3-round-xlarge w3-purple w3-btn w3-ripple w3-hover-deep-orange w3-large w3-border-green" style="letter-spacing:.81px" title="Save Options" onclick="$('#save-btn').click()"><span class="icon-floppy-disk"></span> ${langObj.menu.save.toolTip}</button>`
var openUSB = ''
function finishedMessage (mp) {
  cleanUpTempFolders()
  // Finished message
  if (mp) {
    if (persistantData.get('delCopyFolder')) {
      cleanCopyDir()
      cp2usb = ''
    }
    openUSB = `<h3><button class="w3-round-xlarge w3-amber w3-btn w3-ripple w3-hover-blue w3-large" title='${langObj.popupMsgs[5].msg}' onclick="shell.showItemInFolder('${mp}')"></span><span class="icon-usb3"></span> ${langObj.popupMsgs[5].msg}</button></h3>`
  }
  bootbox.hideAll()
  if (errFlag) {
    bootbox.alert({
      message: `<div class="errMessage w3-center"><span class="w3-closebtn" onclick="location.reload()">&times;</span><h2>An Error Has Occured.  Please Try Again.</h2><br /><h3>${strtOver}</h3><h3>${saveBtn}</h3><h3>${viewLog}</h3></div>`
    })
  } else {
    setTimeout(function () {
      bootbox.dialog({
        message: `<span class="w3-closebtn" onclick="postInstallTitle()">&times;</span><div class="w3-center w3-container w3-blue-grey" style="line-height:1.5;"><h1><small class="icon-bolt3"></small> ${langObj.popupMsgs[20].msg} <small class="icon-magic-wand"></small></h1><h3>${strtOver}</h3><h3>${viewLog}</h3><h3>${openUSB}</h3><h3>${cp2usb}</h3><h3>${closeApp}</h3></div>`,
        closeButton: false
      })
    }, 100)
  }
  setTimeout(function () {
    appendAIOlog(`<li style='color:#000000;font-weight:800;'><em>Finished!</em></li></ul></div>`)
  }, 10000)
}
function postInstallTitle () {
  bootbox.hideAll()
  $('.twkfltr').hide()
  document.getElementById(`mzd-title`).innerHTML = `${viewLog}${document.getElementById('mzd-title').innerHTML}${strtOver}`
}
function cleanCopyDir () {
  rimraf(`${tmpdir}`, function () { appendAIOlog(`<li style='color:#ff3366'>Deleted '_copy_to_usb' Folder</li>`) })
}
function cleanUpTempFolders () {
  if (speedcamPatchFlag) {
    rimraf(path.normalize(path.join(`${__dirname}`, '../org')), function (e) {
      if (e) { appendAIOlog(e) }
      appendAIOlog(`<li style='color:#ff3366'>Deleted Temporary Folders</li>`)
    })
  }
}
function buildCASDK (user) {
  mkdirp.sync(`${tmpdir}/casdk/`)
  addRootFiles()
  if (user.casdk.inst) {
    tweaks2write.push(`${builddir}00__casdk-i.txt`)
    copydir(`${builddir}casdk`, `${tmpdir}/casdk`, function (err) {
      if (err) {
        aioLog(`File Copy Error: ${err}`, err.message)
        return
      }
      aioLog(`Files for CASDK copied successfully!`)
    })
  } else if (user.casdk.uninst) {
    tweaks2write.push(`${builddir}00__casdk-u.txt`)
  } else {
    errFlag = true
    finishedMessage()
    return
  }
  writeTweaksFile()
}
function fullSystemRestore (user) {
  addRootFiles()
  tweaks2write.push(`${builddir}00___fullRestore.sh`)
  if(fs.existsSync(`${extradir}/color-schemes/Red/jci.zip`)) {
    mkdirp.sync(`${tmpdir}/config/color-schemes`)
    aioLog(`Unzipping Red color theme folder`)
    extract(`${extradir}/color-schemes/Red/jci.zip`, {dir: `${tmpdir}/config/color-schemes/Red`}, function (err) {
      if (err) { aioLog(err, err) }
      aioLog(`Red Color Scheme Added Successfully`)
    })
  }
  copydir(`${builddir}config_org`, `${tmpdir}/config_org`, function (err) {
    if (err) {
      aioLog(`File Copy Error: ${err}`, err.message)
      return
    }
    aioLog(`Uninstall files copied successfully!`)
  })
  writeTweaksFile()
}
