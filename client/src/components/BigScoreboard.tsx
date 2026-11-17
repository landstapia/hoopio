import { BRAND, fc } from '../lib/format';
import { SegmentDisplay } from './SegmentDisplay';

export interface ScoreboardSideModel {
  name: string;
  full: string;
  logo?: string;
  color: string;
  score: number;
  fouls: number;
  timeouts: number;
}

export interface ScoreboardPauseModel {
  isBreak: boolean;
  name: string;
  color: string;
  suspended: boolean;
  time: string;
}

export interface ScoreboardModel {
  idle?: string;
  pause?: ScoreboardPauseModel | null;
  left?: ScoreboardSideModel;
  right?: ScoreboardSideModel;
  period?: number;
  clock?: number;
  shotText?: string;
  arrowLeft?: boolean;
  arrowRight?: boolean;
}

function TimeoutTicks({ left, compact = false }: { left: number; compact?: boolean }) {
  const slots = Math.max(3, left);
  return (
    <span className="inline-flex items-center">
      {Array.from({ length: slots }, (_, i) => (
        <i
          key={i}
          className={`inline-block ${
            compact ? 'mx-[0.35vh] h-[3vh] w-[1vh]' : 'mx-[0.5vh] h-[5vh] w-[1.4vh]'
          } ${i < left ? 'bg-[#ff1a1a]' : 'bg-[#1c0505]'}`}
        />
      ))}
    </span>
  );
}

function PossessionArrow({ lit, dir }: { lit?: boolean; dir: 'left' | 'right' }) {
  return (
    <svg
      className={`h-[min(10vh,5vw)] ${dir === 'right' ? '-scale-x-100' : ''} ${
        lit ? 'fill-[#f2a501]' : 'fill-[#1f1600]'
      }`}
      viewBox="0 0 120 80"
      aria-hidden="true"
    >
      <polygon points="0,40 55,0 55,22 120,22 120,58 55,58 55,80" />
    </svg>
  );
}

export function BigScoreboard({ model }: { model: ScoreboardModel }) {
  const frameStyle = {
    boxShadow: 'inset 0 0.7vh 0 #01247c, inset 0 -0.7vh 0 #f2a501',
    fontFamily: 'Arial, Helvetica, sans-serif',
  };

  if (model.idle || !model.left || !model.right) {
    return (
      <div
        style={frameStyle}
        className="fixed inset-0 flex flex-col items-center justify-center gap-[3vh] bg-black text-center text-[8vh] font-bold text-white"
      >
        <img src={BRAND.logo} alt={BRAND.name} className="h-[34vh] w-[34vh] object-contain" />
        <div>{model.idle || 'NO LIVE GAME'}</div>
      </div>
    );
  }

  const period = model.period ?? 1;
  const clock = model.clock ?? 0;

  if (model.pause) {
    const p = model.pause;
    const renderPauseSide = (s: ScoreboardSideModel, rightSide: boolean) => (
      <div
        className={`flex min-w-0 flex-col gap-[0.4vh] ${
          rightSide ? 'items-end text-right' : 'items-start text-left'
        }`}
      >
        <div
          style={{ color: s.color }}
          className="max-w-full overflow-hidden whitespace-nowrap text-[min(5vh,2.8vw)] font-bold uppercase tracking-[0.04em]"
        >
          {s.name}
        </div>
        <div
          className={`leading-none text-[#f2a501] ${
            s.score >= 100 ? 'text-[min(12.5vh,6.6vw)]' : 'text-[min(15vh,8vw)]'
          }`}
        >
          <SegmentDisplay text={s.score} />
        </div>
        <div
          className={`flex items-center gap-[1vw] text-[min(4vh,2.2vw)] text-[#f2a501] ${
            rightSide ? 'flex-row-reverse' : ''
          }`}
        >
          <span className="text-[min(2.2vh,1.2vw)] font-bold tracking-[0.12em] text-slate-300">FOULS</span>
          <SegmentDisplay text={s.fouls} />
          <span className="text-[min(2.2vh,1.2vw)] font-bold tracking-[0.12em] text-slate-300">TIMEOUTS</span>
          <TimeoutTicks left={s.timeouts} compact />
        </div>
      </div>
    );

    return (
      <div
        style={frameStyle}
        className="fixed inset-0 flex flex-col gap-[1.5vh] overflow-hidden bg-black p-[2.5vh_2.5vw] text-center"
      >
        <div className="grid flex-none grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-[2vw] border-b-[0.5vh] border-[#f2a501] pb-[1.5vh]">
          {renderPauseSide(model.left, false)}
          <div className="flex min-w-0 flex-col items-center gap-[0.3vh]">
            <div className="flex items-center gap-[1vw] text-[min(6.5vh,3.6vw)] text-[#f2a501]">
              <span className="text-[min(2.2vh,1.2vw)] font-bold tracking-[0.12em] text-slate-300">PERIOD</span>
              {period > 4 && <span className="text-[0.6em] font-bold">OT</span>}
              <SegmentDisplay text={period > 4 ? period - 4 : period} />
            </div>
            <span className="text-[min(2.2vh,1.2vw)] font-bold tracking-[0.12em] text-slate-300">GAME CLOCK</span>
            <div className="text-[min(9vh,4.8vw)] leading-none text-[#ff2a2a]">
              <SegmentDisplay text={fc(clock)} />
            </div>
          </div>
          {renderPauseSide(model.right, true)}
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-[1vh]">
          <div
            style={{ color: p.isBreak ? '#f2a501' : p.color }}
            className="text-[min(5vh,2.8vw)] font-bold uppercase leading-none tracking-[0.2em]"
          >
            {p.isBreak ? 'BREAK' : 'TIMEOUT'}
          </div>
          <div
            style={{ color: p.isBreak ? '#f2a501' : p.color }}
            className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[min(10vh,5.4vw)] font-bold uppercase leading-[1.05] tracking-[0.03em]"
          >
            {p.isBreak ? 'INTERMISSION' : p.name}
          </div>
          {p.suspended && (
            <div className="rounded-[1.2vh] border-[0.5vh] border-[#fbbf24] px-[2vw] py-[0.3vh] text-[min(4vh,2.2vw)] font-bold leading-[1.1] tracking-[0.16em] text-[#fbbf24]">
              SUSPENDED
            </div>
          )}
          <div className="text-[min(34vh,19vw)] leading-none text-[#f2a501]">
            <SegmentDisplay text={p.time} />
          </div>
        </div>
      </div>
    );
  }

  const renderSide = (s: ScoreboardSideModel, rightSide: boolean) => (
    <div className="flex min-w-0 flex-col items-center justify-around">
      <div className="flex max-w-full min-w-0 items-center justify-center gap-[1.2vw]">
        {s.logo && rightSide && (
          <img
            src={s.logo}
            alt=""
            className="h-[min(13vh,6.5vw)] w-[min(13vh,6.5vw)] flex-none rounded-full object-cover"
          />
        )}
        <div className="min-w-0 overflow-hidden">
          <div
            style={{ color: s.color }}
            className="max-w-full overflow-hidden whitespace-nowrap text-[min(8vh,3.6vw)] font-bold uppercase leading-[0.8] tracking-[0.04em]"
          >
            {s.name}
          </div>
          <div className="mt-[0.3vh] overflow-hidden text-ellipsis whitespace-nowrap text-[min(3.2vh,1.7vw)] text-slate-300">
            {s.full}
          </div>
        </div>
        {s.logo && !rightSide && (
          <img
            src={s.logo}
            alt=""
            className="h-[min(13vh,6.5vw)] w-[min(13vh,6.5vw)] flex-none rounded-full object-cover"
          />
        )}
      </div>

      <div
        className={`text-[#f2a501] ${
          s.score >= 100 ? 'text-[min(30vh,11vw)]' : 'text-[min(36vh,15vw)]'
        }`}
      >
        <SegmentDisplay text={s.score} />
      </div>

      <div className="flex items-center gap-[1.2vw] text-[min(9vh,4vw)] text-[#f2a501]">
        <span className="text-[min(3vh,1.5vw)] font-bold tracking-[0.12em] text-slate-300">FOULS</span>
        <SegmentDisplay text={s.fouls} />
        <span
          className={`rounded-[6px] px-[1vw] py-[0.6vh] text-[min(4vh,2vw)] font-bold ${
            s.fouls >= 5 ? 'bg-[#f2a501] text-black' : 'bg-[#0e0c00] text-[#4a3f00]'
          }`}
        >
          BONUS
        </span>
      </div>

      <div className="flex items-center gap-[1.2vw] text-[min(9vh,4vw)]">
        <span className="text-[min(3vh,1.5vw)] font-bold tracking-[0.12em] text-slate-300">TIMEOUTS</span>
        <TimeoutTicks left={s.timeouts} />
      </div>
    </div>
  );

  return (
    <div
      style={frameStyle}
      className="fixed inset-0 grid grid-cols-[1fr_1.5fr_1fr] gap-[1vw] overflow-hidden bg-black p-[2vh_1.5vw] text-center"
    >
      {renderSide(model.left, false)}

      <div className="flex min-w-0 flex-col items-center justify-around">
        <img src={BRAND.logo} alt={BRAND.name} className="h-[12vh] w-[12vh] object-contain" />
        <div className="flex items-center gap-[1vw] text-[min(10vh,5vw)] text-[#f2a501]">
          <span className="text-[min(3vh,1.5vw)] font-bold tracking-[0.12em] text-slate-300">PERIOD</span>
          {period > 4 && <span className="text-[0.6em] font-bold">OT</span>}
          <SegmentDisplay text={period > 4 ? period - 4 : period} />
        </div>
        <div className="text-[min(29vh,11.5vw)] text-[#ff2a2a]">
          <SegmentDisplay text={fc(clock)} />
        </div>
        <div className="text-[min(19vh,8vw)] text-[#ff2a2a]">
          <SegmentDisplay text={model.shotText ?? '  '} />
        </div>
        <div className="flex items-center gap-[2vw]">
          <PossessionArrow lit={model.arrowLeft} dir="left" />
          <span className="text-[min(3vh,1.5vw)] font-bold tracking-[0.12em] text-slate-300">POSSESSION</span>
          <PossessionArrow lit={model.arrowRight} dir="right" />
        </div>
      </div>

      {renderSide(model.right, true)}
    </div>
  );
}