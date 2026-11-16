// Extracts TM2020 replay inputs from TMTAS Exchange replays into data/inputs/<replayId>.txt
// Output format: TMInterface-style script (time ranges in seconds), e.g.
//   0-1.23 press up
//   0.5 steer -32768
// Usage: dotnet run -- <data/tas.json> <data/inputs>
using System.Text;
using System.Text.Json;
using GBX.NET;
using GBX.NET.Engines.Game;
using GBX.NET.LZO;

Gbx.LZO = new Lzo();
var tasPath = args.Length > 0 ? args[0] : "data/tas.json";
var outDir = args.Length > 1 ? args[1] : "data/inputs";
Directory.CreateDirectory(outDir);

var ids = new List<long>();
using (var doc = JsonDocument.Parse(File.ReadAllText(tasPath)))
    foreach (var map in doc.RootElement.EnumerateObject())
        foreach (var run in map.Value.EnumerateArray())
            if (run.TryGetProperty("id", out var id)) ids.Add(id.GetInt64());

using var http = new HttpClient();
http.DefaultRequestHeaders.UserAgent.ParseAdd("KackyReloadedProject/1.0");
int ok = 0, skip = 0, fail = 0;
foreach (var id in ids.Distinct())
{
    var outFile = Path.Combine(outDir, $"{id}.txt");
    if (File.Exists(outFile)) { skip++; continue; }
    try
    {
        var bytes = await http.GetByteArrayAsync($"https://tmtas.exchange/api/replay?id={id}");
        using var ms = new MemoryStream(bytes);
        var replay = Gbx.ParseNode<CGameCtnReplayRecord>(ms);
        var text = Extract(replay);
        if (string.IsNullOrWhiteSpace(text)) throw new Exception("no inputs found");
        File.WriteAllText(outFile, text);
        ok++;
        Console.WriteLine($"ok   {id}");
    }
    catch (Exception e)
    {
        fail++;
        Console.WriteLine($"FAIL {id}: {e.GetType().Name}: {e.Message}");
    }
    await Task.Delay(300);
}
Console.WriteLine($"extracted {ok}, already had {skip}, failed {fail}");

static string Extract(CGameCtnReplayRecord replay)
{
    // TMTAS Exchange TM2020 format (same as their Input Extractor):
    //   <ms> seed <n> / <ms> accel 1|0 / <ms> brake 1|0 / <ms> steer left|right|<-127..127>
    dynamic ghost = replay.GetGhosts().FirstOrDefault() ?? throw new Exception("no ghost");
    IEnumerable<object> inputs = null;
    object playerInput = null;
    try
    {
        dynamic pis = ghost.PlayerInputs;
        if (pis != null) foreach (dynamic pi in pis) { playerInput = pi; inputs = ((IEnumerable<object>)pi.Inputs).ToList(); break; }
    }
    catch (Exception e) { Console.WriteLine("  PlayerInputs: " + e.Message); }
    if (inputs == null || !inputs.Any())
        try { inputs = ((IEnumerable<object>)ghost.Inputs).ToList(); } catch { }
    if (inputs == null) throw new Exception("ghost has no input list");

    var lines = new List<(int t, string s)>();
    var seed = FindSeed(replay, (object)ghost, playerInput);
    if (seed != null) lines.Add((0, $"0 seed {seed}"));
    var held = new Dictionary<string, bool> { ["accel"] = false, ["brake"] = false };
    var types = new HashSet<string>();
    int last = 0;
    foreach (dynamic inp in inputs)
    {
        string name = ((object)inp).GetType().Name;
        types.Add(name);
        int ms = Ms(inp);
        if (ms > last) last = ms;
        switch (name)
        {
            case "Accelerate": case "Gas": case "AccelerateReal": case "AccelerateTM2020":
                Key("accel", inp, ms); break;
            case "Brake": case "BrakeReal": case "BrakeTM2020":
                Key("brake", inp, ms); break;
            case "Steer": case "SteerTM2020": case "SteerOld":
                {
                    int v = Convert.ToInt32(inp.Value);
                    if (name != "SteerTM2020" && Math.Abs(v) > 128) v = (int)Math.Round(v / 65536.0 * 127);
                    lines.Add((ms, $"{ms} steer {(v <= -127 ? "left" : v >= 127 ? "right" : v.ToString())}"));
                    break;
                }
            case "Respawn": case "RespawnTM2020":
                if (Pressed(inp)) lines.Add((ms, $"{ms} respawn")); break;
            case "Horn":
                if (Pressed(inp)) lines.Add((ms, $"{ms} horn")); break;
            default: break; // camera / internal events
        }
    }
    // release anything still held at the final tick (matches TMTAS output)
    int at = lines.FindIndex(l => l.t == last && l.s.Contains(" steer "));
    if (at < 0) at = lines.Count;
    foreach (var k in new[] { "accel", "brake" })
        if (held[k]) { lines.Insert(at++, (last, $"{last} {k} 0")); held[k] = false; }
    Console.WriteLine("  input types: " + string.Join(",", types) + (seed == null ? "  (seed not found)" : $"  seed {seed}"));
    return string.Join("\n", lines.Select(l => l.s)) + "\n";

    void Key(string key, dynamic inp, int ms)
    {
        bool p = Pressed(inp);
        if (held[key] == p) return;
        held[key] = p;
        lines.Add((ms, $"{ms} {key} {(p ? 1 : 0)}"));
    }
}

// The race seed lives in different places depending on the GBX.NET version; look for it by name.
static object FindSeed(params object[] roots)
{
    foreach (var root in roots)
    {
        if (root == null) continue;
        foreach (var obj in new[] { root }.Concat(Children(root)))
            foreach (var p in obj.GetType().GetProperties())
            {
                if (!p.Name.Contains("Seed", StringComparison.OrdinalIgnoreCase) || p.GetIndexParameters().Length > 0) continue;
                try { var v = p.GetValue(obj); if (v != null && v is not string) { Console.WriteLine($"  seed from {obj.GetType().Name}.{p.Name}"); return v; } } catch { }
            }
    }
    if (Environment.GetEnvironmentVariable("DUMP_PROPS") == "1")
        foreach (var root in roots.Where(r => r != null))
            Console.WriteLine($"  {root.GetType().Name}: " + string.Join(", ", root.GetType().GetProperties().Where(p => p.GetIndexParameters().Length == 0).Select(p => { try { var v = p.GetValue(root); return $"{p.Name}={(v is System.Collections.IEnumerable && v is not string ? "[..]" : v)}"; } catch { return p.Name + "=?"; } })));
    return null;
}

static IEnumerable<object> Children(object o)
{
    foreach (var p in o.GetType().GetProperties())
    {
        if (p.GetIndexParameters().Length > 0 || p.PropertyType.IsPrimitive || p.PropertyType == typeof(string)) continue;
        object v = null;
        try { v = p.GetValue(o); } catch { }
        if (v != null && v is not System.Collections.IEnumerable && v.GetType().Namespace?.StartsWith("GBX") == true) yield return v;
    }
}

static bool Pressed(dynamic inp) { try { return (bool)inp.Pressed; } catch { return true; } }
static int Ms(dynamic inp)
{
    object t = inp.Time;
    try { return (int)((dynamic)t).TotalMilliseconds; } catch { }
    try { return Convert.ToInt32(t); } catch { return 0; }
}
