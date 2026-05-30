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
        public InputUnion U;
    }

    [StructLayout(LayoutKind.Explicit)]
    public struct InputUnion
    {
        [FieldOffset(0)] public KEYBDINPUT ki;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct KEYBDINPUT
    {
        public UInt16 wVk;
        public UInt16 wScan;
        public UInt32 dwFlags;
        public UInt32 time;
        public UIntPtr dwExtraInfo;
    }

    [DllImport("user32.dll", SetLastError = true)]
    public static extern UInt32 SendInput(UInt32 nInputs, INPUT[] pInputs, Int32 cbSize);

    [DllImport("user32.dll")]
    public static extern UInt32 MapVirtualKey(UInt32 uCode, UInt32 uMapType);

    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, UInt32 dwFlags, UIntPtr dwExtraInfo);

    public const UInt32 INPUT_KEYBOARD = 1;
    public const UInt32 KEYEVENTF_EXTENDEDKEY = 0x0001;
    public const UInt32 KEYEVENTF_KEYUP = 0x0002;

    public static string SendKey(UInt16 vk, bool keyUp, bool extended)
    {
        INPUT[] inputs = new INPUT[1];
        inputs[0].type = INPUT_KEYBOARD;
        inputs[0].U.ki.wVk = vk;
        inputs[0].U.ki.wScan = 0;
        inputs[0].U.ki.dwFlags = (keyUp ? KEYEVENTF_KEYUP : 0) | (extended ? KEYEVENTF_EXTENDEDKEY : 0);
        inputs[0].U.ki.time = 0;
        inputs[0].U.ki.dwExtraInfo = UIntPtr.Zero;

        int inputSize = Marshal.SizeOf(typeof(INPUT));
        UInt32 sent = SendInput(1, inputs, inputSize);

        if (sent == 1)
        {
            return "SENDINPUT_OK size=" + inputSize;
        }

        int lastError = Marshal.GetLastWin32Error();

        // Fallback for machines where the structured SendInput call fails.
        byte scan = (byte)MapVirtualKey(vk, 0);
        UInt32 flags = (keyUp ? KEYEVENTF_KEYUP : 0) | (extended ? KEYEVENTF_EXTENDEDKEY : 0);
        keybd_event((byte)vk, scan, flags, UIntPtr.Zero);
        return "KEYBD_EVENT_FALLBACK lastError=" + lastError + " size=" + inputSize;
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

[Console]::Out.WriteLine("READY pid=" + $PID)
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
        $result = [KeyboardSender]::SendKey([UInt16]$item.vk, [bool]$isUp, [bool]$item.ext)
        [Console]::Out.WriteLine("OK " + $action + " " + $code + " " + $result)
        [Console]::Out.Flush()
    }
    catch {
        [Console]::Error.WriteLine("ERROR " + $_.Exception.Message)
        [Console]::Error.Flush()
    }
}
