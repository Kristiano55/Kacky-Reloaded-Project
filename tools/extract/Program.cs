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
    dynamic ghost = replay.GetGhosts().FirstOrDefault() ?? throw new Exception("no ghost");
    IEnumerable<object> inputs = null;
    try
    {
        dynamic pis = ghost.PlayerInputs;
        if (pis != null) foreach (dynamic pi in pis) { inputs = ((IEnumerable<object>)pi.Inputs).ToList(); break; }
    }
    catch (Exception e) { Console.WriteLine("  PlayerInputs: " + e.Message); }
    if (inputs == null || !inputs.Any())
        try { inputs = ((IEnumerable<object>)ghost.Inputs).ToList(); } catch { }
    if (inputs == null) throw new Exception("ghost has no input list");

    var sb = new StringBuilder();
    sb.AppendLine($"# Kacky Reloaded TAS inputs · extracted from TMTAS Exchange replay");
    var open = new Dictionary<string, int>();         // key -> press start ms
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
            case "Accelerate": case "Gas": case "AccelerateReal": Key("up", inp, ms); break;
            case "Brake": case "BrakeReal": Key("down", inp, ms); break;
            case "SteerLeft": Key("left", inp, ms); break;
            case "SteerRight": Key("right", inp, ms); break;
            case "Steer": case "SteerTM2020": case "SteerOld":
                {
                    double v = (double)Convert.ToDouble(inp.Value);
                    int steer = name == "SteerTM2020" || Math.Abs(v) <= 127 ? (int)Math.Round(v / 127.0 * 65536) : (int)v;
                    sb.AppendLine($"{S(ms)} steer {Math.Clamp(steer, -65536, 65536)}");
                    break;
                }
            case "Respawn": case "RespawnTM2020": if (Pressed(inp)) sb.AppendLine($"{S(ms)} press enter"); break;
            case "Horn": if (Pressed(inp)) sb.AppendLine($"{S(ms)} press horn"); break;
            default: break; // ignore camera / internal events
        }
    }
    foreach (var (k, start) in open) sb.AppendLine($"{S(start)}-{S(last)} press {k}");
    Console.WriteLine("  input types: " + string.Join(",", types));
    return sb.ToString();

    void Key(string key, dynamic inp, int ms)
    {
        if (Pressed(inp)) { if (!open.ContainsKey(key)) open[key] = ms; }
        else if (open.Remove(key, out var start)) sb.AppendLine($"{S(start)}-{S(ms)} press {key}");
    }
}

static bool Pressed(dynamic inp) { try { return (bool)inp.Pressed; } catch { return true; } }
static int Ms(dynamic inp)
{
    object t = inp.Time;
    try { return (int)((dynamic)t).TotalMilliseconds; } catch { }
    try { return Convert.ToInt32(t); } catch { return 0; }
}
static string S(int ms) => (ms / 1000.0).ToString("0.00", System.Globalization.CultureInfo.InvariantCulture);
