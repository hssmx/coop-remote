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
    "KeyW" = @{ vk = 0x57; ext = $false }; "KeyA" = @{ vk = 0x41; ext = $false }
    "KeyS" = @{ vk = 0x53; ext = $false }; "KeyD" = @{ vk = 0x44; ext = $false }

    "ArrowUp" = @{ vk = 0x26; ext = $true }; "ArrowDown" = @{ vk = 0x28; ext = $true }
    "ArrowLeft" = @{ vk = 0x25; ext = $true }; "ArrowRight" = @{ vk = 0x27; ext = $true }

    "Space" = @{ vk = 0x20; ext = $false }; "Enter" = @{ vk = 0x0D; ext = $false }
    "ShiftLeft" = @{ vk = 0x10; ext = $false }; "ShiftRight" = @{ vk = 0x10; ext = $false }
    "ControlLeft" = @{ vk = 0x11; ext = $false }; "ControlRight" = @{ vk = 0x11; ext = $false }
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
