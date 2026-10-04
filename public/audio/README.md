# Soundtrack

Drop MP3 files here and list them in `tracks.json`, e.g. `["title", "match", "tension", "victory", "defeat"]`.

| File | Plays | Loop |
|---|---|---|
| `title.mp3` | title screen | yes |
| `match.mp3` | during a match (low/mid tension) | yes |
| `tension.mp3` | crossfades in when someone nears victory | yes |
| `victory.mp3` | stinger when you win | no |
| `defeat.mp3` | stinger when you lose | no |

Any track not listed falls back to the procedural score, which keeps playing quietly underneath recorded tracks. Use loop-friendly exports (128–192 kbps MP3, loudness around −16 LUFS).
