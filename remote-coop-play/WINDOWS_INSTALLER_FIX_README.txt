WINDOWS INSTALLER FIX

The Windows error showed the executable running from:
AppData\Local\Temp\scoped_dir...

That means the build was a portable Electron app extracted into a temporary folder.
Windows can block that temp child executable, especially because this app contains remote input / keyboard / mouse helper code.

This package changes the Windows build:
- removes the portable temp-extract target
- creates an NSIS installer instead
- also creates a zip build
- unpacks the native PowerShell helper properly

After rebuilding, use the installer:
Remote-Coop-Play-3.0.0-x64.exe

If Defender still blocks it:
- Right click the installer > Properties > Unblock
- Or Windows Security > Protection history > Allow on device