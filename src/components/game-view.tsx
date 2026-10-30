import { useEffect, useRef } from "react";
import { Coins, House, RotateCw, Volume2, VolumeX } from "lucide-react";
import { useHud, patchHud, getHud } from "@/game/hud-store";
import { unlockAudio, setMusicMuted } from "@/game/audio";
import { MODULES, type Mode, type ModuleId } from "@/game/types";
import type { WorldHandle } from "@/game/world";

const MODES: { id: Mode; label: string }[] = [
  { id: "dance", label: "Танец" },
  { id: "run", label: "Бег" },
  { id: "build", label: "Стройка" },
];

export function GameView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const api = useRef<WorldHandle | null>(null);
  const hud = useHud();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let dead = false;
    let handle: WorldHandle | null = null;
    void import("@/game/world").then(({ mountWorld }) => {
      if (dead || !canvasRef.current) return;
      try {
        handle = mountWorld(canvasRef.current);
        api.current = handle;
      } catch (err) {
        patchHud({
          ready: true,
          error: err instanceof Error ? err.message : "Сцена не собралась",
        });
      }
    });
    return () => {
      dead = true;
      handle?.dispose();
      api.current = null;
    };
  }, []);

  function startShow() {
    unlockAudio();
    setMusicMuted(getHud().muted);
    patchHud({ started: true });
  }

  function setMode(mode: Mode) {
    patchHud({ mode });
  }

  function selectModule(id: ModuleId) {
    patchHud({ module: id, mode: "build" });
  }

  return (
    <main className="game-shell">
      <canvas ref={canvasRef} className="game-canvas" aria-label="Сцена Искорки" />
      <div className="vignette" />
      <div className="pointer-events-none absolute inset-0 flex flex-col">
        {hud.started ? (
          <header className="flex items-start justify-between gap-3 p-3 sm:p-4">
            <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-gold/40 bg-panel/80 px-3 py-2 backdrop-blur-md">
              <Coins className="size-5 text-gold" aria-hidden />
              <span className="font-display text-xl leading-none font-bold text-gold tabular-nums">
                {hud.coins}
              </span>
              {hud.combo > 0 ? (
                <span className="text-sm font-extrabold text-flame tabular-nums">×{hud.combo + 1}</span>
              ) : null}
            </div>
            <div className="pointer-events-none min-w-0 flex-1 px-1 text-center">
              {hud.line ? (
                <div key={hud.line} className="lyric-in">
                  <p className="font-display text-2xl leading-none font-bold text-gold text-balance sm:text-3xl">
                    {hud.syl}
                  </p>
                  <p className="mt-1 text-sm text-dim text-pretty">{hud.line}</p>
                </div>
              ) : (
                <p className="text-sm text-dim">Искорка берёт ноту…</p>
              )}
            </div>
            <div className="pointer-events-auto flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-full border border-gold/30 bg-panel/80 px-3 py-2 backdrop-blur-md">
                <House className="size-4 text-cream" aria-hidden />
                <span className="text-sm font-bold tabular-nums">{hud.houses}/2</span>
              </div>
              <button
                type="button"
                className="flex size-11 items-center justify-center rounded-full border border-gold/30 bg-panel/80 text-cream backdrop-blur-md"
                aria-label={hud.muted ? "Включить звук" : "Выключить звук"}
                onClick={() => {
                  const muted = !getHud().muted;
                  setMusicMuted(muted);
                  patchHud({ muted });
                }}
              >
                {hud.muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
              </button>
            </div>
          </header>
        ) : (
          <div className="flex-1" />
        )}

        {hud.toast ? (
          <p className="pointer-events-none mx-auto mt-2 rounded-full bg-panel/85 px-4 py-2 text-sm font-bold text-cream">
            {hud.toast}
          </p>
        ) : null}

        <div className="mt-auto flex flex-col gap-2 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {hud.started && hud.mode === "build" ? (
            <div className="pointer-events-auto flex gap-2 overflow-x-auto pb-1">
              {MODULES.map((mod) => {
                const active = hud.module === mod.id;
                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => selectModule(mod.id)}
                    className={
                      "min-h-11 shrink-0 rounded-2xl border px-3 py-2 text-left " +
                      (active
                        ? "border-gold bg-forest text-cream"
                        : "border-gold/25 bg-panel/80 text-cream")
                    }
                  >
                    <span className="block text-sm font-extrabold">{mod.name}</span>
                    <span className="block text-xs text-dim tabular-nums">
                      {mod.cost > 0 ? `${mod.cost} мон.` : "вернуть"}
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-2xl border border-gold/25 bg-panel/80 text-cream"
                aria-label="Повернуть"
                onClick={() => patchHud({ rot: (getHud().rot + 1) % 4 })}
              >
                <RotateCw className="size-5" />
              </button>
            </div>
          ) : null}

          {hud.started ? (
            <div className="flex items-end justify-between gap-3">
              <Joystick onChange={(x, y) => api.current?.setJoy(x, y)} />
              <div className="pointer-events-auto mx-auto flex flex-wrap justify-center gap-2">
                {MODES.map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setMode(mode.id)}
                    className={
                      "min-h-11 rounded-full px-4 text-sm font-extrabold " +
                      (hud.mode === mode.id ? "bg-gold text-ink" : "bg-panel/80 text-cream")
                    }
                  >
                    {mode.label}
                  </button>
                ))}
                <button
                  type="button"
                  className="min-h-11 rounded-full bg-forest px-4 text-sm font-extrabold text-cream"
                  onClick={() => patchHud({ emoteSeq: getHud().emoteSeq + 1, mode: "dance" })}
                >
                  Реверанс
                </button>
              </div>
              <div className="touch-only size-28 shrink-0" />
            </div>
          ) : null}
          {hud.started ? (
            <p className="text-center text-xs text-dim">
              WASD — бег и поворот, пробел — реверанс, цифры 1–8 — модули
            </p>
          ) : null}
        </div>
      </div>

      {hud.started ? null : (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-8">
          <section className="pointer-events-auto w-full max-w-md rounded-3xl border border-gold/35 bg-panel/88 p-4 shadow-2xl backdrop-blur-md sm:p-5">
            <p className="text-xs font-extrabold tracking-[0.22em] text-gold uppercase">Вечерний спектакль</p>
            <h1 className="mt-1 font-display text-4xl leading-none font-bold text-cream italic text-balance sm:text-5xl">
              Искорка
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-dim text-pretty sm:text-base">
              Поёт под софитами, бегает за монетками и ставит модульные домики.
            </p>
            {hud.error ? <p className="mt-3 text-sm text-flame">{hud.error}</p> : null}
            <button
              id="start-show"
              type="button"
              aria-label="Start"
              disabled={!hud.ready && !hud.error}
              onClick={startShow}
              className="mt-4 flex min-h-12 w-full items-center justify-center rounded-full bg-gold text-base font-extrabold text-ink disabled:opacity-60"
            >
              <span className="sr-only">Start</span>
              {hud.ready || hud.error ? "На сцену" : "Софиты греются…"}
            </button>
          </section>
        </div>
      )}
    </main>
  );
}

function Joystick({ onChange }: { onChange: (x: number, y: number) => void }) {
  const baseRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const pid = useRef<number | null>(null);
  const cb = useRef(onChange);
  cb.current = onChange;

  function place(clientX: number, clientY: number) {
    const el = baseRef.current;
    const knob = knobRef.current;
    if (!el || !knob) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const max = rect.width * 0.34;
    const mag = Math.hypot(dx, dy) || 1;
    if (mag > max) {
      dx = (dx / mag) * max;
      dy = (dy / mag) * max;
    }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    cb.current(dx / max, -dy / max);
  }

  function release() {
    pid.current = null;
    if (knobRef.current) knobRef.current.style.transform = "translate(0px, 0px)";
    cb.current(0, 0);
  }

  return (
    <div
      ref={baseRef}
      className="touch-only pointer-events-auto relative size-28 shrink-0 rounded-full border border-gold/30 bg-panel/70 backdrop-blur-md"
      style={{ touchAction: "none" }}
      role="slider"
      aria-label="Джойстик"
      aria-valuemin={-1}
      aria-valuemax={1}
      onPointerDown={(event) => {
        pid.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        place(event.clientX, event.clientY);
      }}
      onPointerMove={(event) => {
        if (pid.current !== event.pointerId) return;
        place(event.clientX, event.clientY);
      }}
      onPointerUp={(event) => {
        if (pid.current !== event.pointerId) return;
        release();
      }}
      onPointerCancel={release}
    >
      <div
        ref={knobRef}
        className="absolute top-1/2 left-1/2 size-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold"
      />
    </div>
  );
}
