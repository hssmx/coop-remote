$ErrorActionPreference = "Stop"

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public static class InputSender
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
        [FieldOffset(0)] public MOUSEINPUT mi;
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

    [StructLayout(LayoutKind.Sequential)]
    public struct MOUSEINPUT
    {
        public Int32 dx;
        public Int32 dy;
        public UInt32 mouseData;
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

    [DllImport("user32.dll")]
    public static extern int GetSystemMetrics(int nIndex);

    public const UInt32 INPUT_MOUSE = 0;
    public const UInt32 INPUT_KEYBOARD = 1;
    public const UInt32 KEYEVENTF_EXTENDEDKEY = 0x0001;
    public const UInt32 KEYEVENTF_KEYUP = 0x0002;

    public const UInt32 MOUSEEVENTF_MOVE = 0x0001;
    public const UInt32 MOUSEEVENTF_LEFTDOWN = 0x0002;
    public const UInt32 MOUSEEVENTF_LEFTUP = 0x0004;
    public const UInt32 MOUSEEVENTF_RIGHTDOWN = 0x0008;
    public const UInt32 MOUSEEVENTF_RIGHTUP = 0x0010;
    public const UInt32 MOUSEEVENTF_MIDDLEDOWN = 0x0020;
    public const UInt32 MOUSEEVENTF_MIDDLEUP = 0x0040;
    public const UInt32 MOUSEEVENTF_WHEEL = 0x0800;
    public const UInt32 MOUSEEVENTF_ABSOLUTE = 0x8000;

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

        if (sent == 1) return "SENDINPUT_KEY_OK size=" + inputSize;

        int lastError = Marshal.GetLastWin32Error();
        byte scan = (byte)MapVirtualKey(vk, 0);
        UInt32 flags = (keyUp ? KEYEVENTF_KEYUP : 0) | (extended ? KEYEVENTF_EXTENDEDKEY : 0);
        keybd_event((byte)vk, scan, flags, UIntPtr.Zero);
        return "KEYBD_EVENT_FALLBACK lastError=" + lastError + " size=" + inputSize;
    }

    public static string SendMouseAbs(double xRatio, double yRatio, string action, string button, int deltaY)
    {
        int screenW = GetSystemMetrics(0);
        int screenH = GetSystemMetrics(1);
        int x = (int)Math.Round(Math.Max(0, Math.Min(1, xRatio)) * 65535);
        int y = (int)Math.Round(Math.Max(0, Math.Min(1, yRatio)) * 65535);

        UInt32 flags = MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_MOVE;
        UInt32 data = 0;

        if (action == "down")
        {
            if (button == "right") flags |= MOUSEEVENTF_RIGHTDOWN;
            else if (button == "middle") flags |= MOUSEEVENTF_MIDDLEDOWN;
            else flags |= MOUSEEVENTF_LEFTDOWN;
        }
        else if (action == "up")
        {
            if (button == "right") flags |= MOUSEEVENTF_RIGHTUP;
            else if (button == "middle") flags |= MOUSEEVENTF_MIDDLEUP;
            else flags |= MOUSEEVENTF_LEFTUP;
        }
        else if (action == "wheel")
        {
            flags = MOUSEEVENTF_WHEEL;
            data = (UInt32)(deltaY < 0 ? 120 : 4294967176);
            x = 0; y = 0;
        }

        INPUT[] inputs = new INPUT[1];
        inputs[0].type = INPUT_MOUSE;
        inputs[0].U.mi.dx = x;
        inputs[0].U.mi.dy = y;
        inputs[0].U.mi.mouseData = data;
        inputs[0].U.mi.dwFlags = flags;
        inputs[0].U.mi.time = 0;
        inputs[0].U.mi.dwExtraInfo = UIntPtr.Zero;

        int inputSize = Marshal.SizeOf(typeof(INPUT));
        UInt32 sent = SendInput(1, inputs, inputSize);
        if (sent == 1) return "SENDINPUT_MOUSE_OK " + action + " screen=" + screenW + "x" + screenH;

        int lastError = Marshal.GetLastWin32Error();
        return "SENDINPUT_MOUSE_FAILED lastError=" + lastError;
    }
}
"@

$KeyMap = @{
    "Backquote" = @{ vk = 0xC0; ext = $false }
    "Digit1" = @{ vk = 0x31; ext = $false }
    "Digit2" = @{ vk = 0x32; ext = $false }
    "Digit3" = @{ vk = 0x33; ext = $false }
    "Digit4" = @{ vk = 0x34; ext = $false }
    "Digit5" = @{ vk = 0x35; ext = $false }
    "Digit6" = @{ vk = 0x36; ext = $false }
    "Digit7" = @{ vk = 0x37; ext = $false }
    "Digit8" = @{ vk = 0x38; ext = $false }
    "Digit9" = @{ vk = 0x39; ext = $false }
    "Digit0" = @{ vk = 0x30; ext = $false }
    "Minus" = @{ vk = 0xBD; ext = $false }
    "Equal" = @{ vk = 0xBB; ext = $false }
    "Backspace" = @{ vk = 0x08; ext = $false }
    "Tab" = @{ vk = 0x09; ext = $false }
    "KeyQ" = @{ vk = 0x51; ext = $false }
    "KeyW" = @{ vk = 0x57; ext = $false }
    "KeyE" = @{ vk = 0x45; ext = $false }
    "KeyR" = @{ vk = 0x52; ext = $false }
    "KeyT" = @{ vk = 0x54; ext = $false }
    "KeyY" = @{ vk = 0x59; ext = $false }
    "KeyU" = @{ vk = 0x55; ext = $false }
    "KeyI" = @{ vk = 0x49; ext = $false }
    "KeyO" = @{ vk = 0x4F; ext = $false }
    "KeyP" = @{ vk = 0x50; ext = $false }
    "BracketLeft" = @{ vk = 0xDB; ext = $false }
    "BracketRight" = @{ vk = 0xDD; ext = $false }
    "Backslash" = @{ vk = 0xDC; ext = $false }
    "CapsLock" = @{ vk = 0x14; ext = $false }
    "KeyA" = @{ vk = 0x41; ext = $false }
    "KeyS" = @{ vk = 0x53; ext = $false }
    "KeyD" = @{ vk = 0x44; ext = $false }
    "KeyF" = @{ vk = 0x46; ext = $false }
    "KeyG" = @{ vk = 0x47; ext = $false }
    "KeyH" = @{ vk = 0x48; ext = $false }
    "KeyJ" = @{ vk = 0x4A; ext = $false }
    "KeyK" = @{ vk = 0x4B; ext = $false }
    "KeyL" = @{ vk = 0x4C; ext = $false }
    "Semicolon" = @{ vk = 0xBA; ext = $false }
    "Quote" = @{ vk = 0xDE; ext = $false }
    "Enter" = @{ vk = 0x0D; ext = $false }
    "ShiftLeft" = @{ vk = 0x10; ext = $false }
    "KeyZ" = @{ vk = 0x5A; ext = $false }
    "KeyX" = @{ vk = 0x58; ext = $false }
    "KeyC" = @{ vk = 0x43; ext = $false }
    "KeyV" = @{ vk = 0x56; ext = $false }
    "KeyB" = @{ vk = 0x42; ext = $false }
    "KeyN" = @{ vk = 0x4E; ext = $false }
    "KeyM" = @{ vk = 0x4D; ext = $false }
    "Comma" = @{ vk = 0xBC; ext = $false }
    "Period" = @{ vk = 0xBE; ext = $false }
    "Slash" = @{ vk = 0xBF; ext = $false }
    "ShiftRight" = @{ vk = 0x10; ext = $false }
    "ControlLeft" = @{ vk = 0x11; ext = $false }
    "AltLeft" = @{ vk = 0x12; ext = $false }
    "Space" = @{ vk = 0x20; ext = $false }
    "AltRight" = @{ vk = 0x12; ext = $false }
    "ControlRight" = @{ vk = 0x11; ext = $false }
    "ArrowUp" = @{ vk = 0x26; ext = $true }
    "ArrowDown" = @{ vk = 0x28; ext = $true }
    "ArrowLeft" = @{ vk = 0x25; ext = $true }
    "ArrowRight" = @{ vk = 0x27; ext = $true }
    "Insert" = @{ vk = 0x2D; ext = $true }
    "Delete" = @{ vk = 0x2E; ext = $true }
    "Home" = @{ vk = 0x24; ext = $true }
    "End" = @{ vk = 0x23; ext = $true }
    "PageUp" = @{ vk = 0x21; ext = $true }
    "PageDown" = @{ vk = 0x22; ext = $true }
    "Escape" = @{ vk = 0x1B; ext = $false }
    "F1" = @{ vk = 0x70; ext = $false }
    "F2" = @{ vk = 0x71; ext = $false }
    "F3" = @{ vk = 0x72; ext = $false }
    "F4" = @{ vk = 0x73; ext = $false }
    "F5" = @{ vk = 0x74; ext = $false }
    "F6" = @{ vk = 0x75; ext = $false }
    "F7" = @{ vk = 0x76; ext = $false }
    "F8" = @{ vk = 0x77; ext = $false }
    "F9" = @{ vk = 0x78; ext = $false }
    "F10" = @{ vk = 0x79; ext = $false }
    "F11" = @{ vk = 0x7A; ext = $false }
    "F12" = @{ vk = 0x7B; ext = $false }
}

[Console]::Out.WriteLine("READY pid=" + $PID)
[Console]::Out.Flush()

while ($true) {
    $line = [Console]::In.ReadLine()
    if ($null -eq $line) { break }
    if ([string]::IsNullOrWhiteSpace($line)) { continue }

    try {
        $msg = $line | ConvertFrom-Json

        if ([string]$msg.type -eq "mouse") {
            $result = [InputSender]::SendMouseAbs([double]$msg.xRatio, [double]$msg.yRatio, [string]$msg.action, [string]$msg.button, [int]$msg.deltaY)
            [Console]::Out.WriteLine("OK_MOUSE " + $result)
            [Console]::Out.Flush()
            continue
        }

        $code = [string]$msg.code
        $action = [string]$msg.action

        if (-not $KeyMap.ContainsKey($code)) {
            [Console]::Out.WriteLine("IGNORED_KEY " + $code)
            [Console]::Out.Flush()
            continue
        }

        $isUp = $action -eq "up"
        $item = $KeyMap[$code]
        $result = [InputSender]::SendKey([UInt16]$item.vk, [bool]$isUp, [bool]$item.ext)
        [Console]::Out.WriteLine("OK " + $action + " " + $code + " " + $result)
        [Console]::Out.Flush()
    }
    catch {
        [Console]::Error.WriteLine("ERROR " + $_.Exception.Message)
        [Console]::Error.Flush()
    }
}
