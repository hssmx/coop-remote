$ErrorActionPreference = "Stop"

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public static class KeyboardSender
{
    [StructLayout(LayoutKind.Sequential)]
    public struct INPUT
    {
        public UInt32 type;
        public KEYBDINPUT ki;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct KEYBDINPUT
    {
        public UInt16 wVk;
        public UInt16 wScan;
        public UInt32 dwFlags;
        public UInt32 time;
        public IntPtr dwExtraInfo;
    }

    [DllImport("user32.dll", SetLastError = true)]
    public static extern UInt32 SendInput(UInt32 nInputs, INPUT[] pInputs, Int32 cbSize);

    public const UInt32 INPUT_KEYBOARD = 1;
    public const UInt32 KEYEVENTF_KEYUP = 0x0002;
    public const UInt32 KEYEVENTF_EXTENDEDKEY = 0x0001;

    public static void SendKey(UInt16 vk, bool keyUp, bool extended)
    {
        INPUT[] inputs = new INPUT[1];
        inputs[0].type = INPUT_KEYBOARD;
        inputs[0].ki.wVk = vk;
        inputs[0].ki.wScan = 0;
        inputs[0].ki.dwFlags = (keyUp ? KEYEVENTF_KEYUP : 0) | (extended ? KEYEVENTF_EXTENDEDKEY : 0);
        inputs[0].ki.time = 0;
        inputs[0].ki.dwExtraInfo = IntPtr.Zero;

        UInt32 sent = SendInput(1, inputs, Marshal.SizeOf(typeof(INPUT)));
        if (sent != 1)
        {
            throw new Exception("SendInput failed.");
        }
    }
}
"@

$KeyMap = @{
    "KeyW" = @{ vk = 0x57; ext = $false }
    "KeyA" = @{ vk = 0x41; ext = $false }
    "KeyS" = @{ vk = 0x53; ext = $false }
    "KeyD" = @{ vk = 0x44; ext = $false }

    "ArrowUp" = @{ vk = 0x26; ext = $true }
    "ArrowDown" = @{ vk = 0x28; ext = $true }
    "ArrowLeft" = @{ vk = 0x25; ext = $true }
    "ArrowRight" = @{ vk = 0x27; ext = $true }

    "Space" = @{ vk = 0x20; ext = $false }
    "Enter" = @{ vk = 0x0D; ext = $false }

    "ShiftLeft" = @{ vk = 0x10; ext = $false }
    "ShiftRight" = @{ vk = 0x10; ext = $false }
    "ControlLeft" = @{ vk = 0x11; ext = $false }
    "ControlRight" = @{ vk = 0x11; ext = $false }
}

[Console]::Out.WriteLine("READY")
[Console]::Out.Flush()

while ($true) {
    $line = [Console]::In.ReadLine()
    if ($null -eq $line) { break }
    if ([string]::IsNullOrWhiteSpace($line)) { continue }

    try {
        $msg = $line | ConvertFrom-Json
        $code = [string]$msg.code
        $action = [string]$msg.action

        if (-not $KeyMap.ContainsKey($code)) {
            [Console]::Out.WriteLine("IGNORED_KEY " + $code)
            [Console]::Out.Flush()
            continue
        }

        $isUp = $action -eq "up"
        $item = $KeyMap[$code]
        [KeyboardSender]::SendKey([UInt16]$item.vk, [bool]$isUp, [bool]$item.ext)
        [Console]::Out.WriteLine("OK " + $action + " " + $code)
        [Console]::Out.Flush()
    }
    catch {
        [Console]::Error.WriteLine($_.Exception.Message)
        [Console]::Error.Flush()
    }
}
