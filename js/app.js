(() => {
  "use strict";

  const TOTAL_QUESTIONS = 10;
  const REL_TOLERANCE = 0.02;
  const E_CHARGE = 1.602e-19;
  const G_ACC = 9.81;
  const LEVELS = ["makkelijk", "gemiddeld", "moeilijk"];

  const TYPE_LABELS = {
    ohm: "Wet van Ohm",
    vermogen: "Vermogen",
    energie: "Energie & kWh",
    lading: "Lading",
    serie: "Serieschakeling",
    parallel: "Parallelschakeling",
    gemengd: "Gemengde schakeling",
    geleidbaarheid: "Geleidbaarheid",
    soortelijk: "Soortelijke weerstand",
    rendement: "Rendement",
    transformator: "Transformator",
    eenheden: "Eenheden omrekenen",
    formules: "Formules & eenheden",
    mix: "Mix"
  };

  // Factor van elke eenheid t.o.v. de basiseenheid van dezelfde grootheid.
  const UNIT_FACTOR = {
    "": 1, "%": 0.01,
    A: 1, mA: 1e-3, "μA": 1e-6,
    V: 1, kV: 1e3, mV: 1e-3,
    "Ω": 1, "kΩ": 1e3, "MΩ": 1e6,
    W: 1, kW: 1e3, MW: 1e6, mW: 1e-3,
    J: 1, kJ: 1e3, MJ: 1e6, kWh: 3.6e6,
    C: 1, mC: 1e-3, "μC": 1e-6, mAh: 3.6, Ah: 3600,
    S: 1, mS: 1e-3, "μS": 1e-6,
    s: 1, min: 60, h: 3600,
    m: 1, km: 1e3, cm: 1e-2, mm: 1e-3,
    kg: 1,
    "m²": 1, "mm²": 1e-6,
    "Ω·m": 1
  };

  const DEFAULT_UNITS = {
    A: ["A", "mA", "μA"],
    V: ["kV", "V", "mV"],
    "Ω": ["MΩ", "kΩ", "Ω"],
    W: ["MW", "kW", "W", "mW"],
    J: ["MJ", "kJ", "J"],
    C: ["C", "mC", "μC"],
    S: ["S", "mS", "μS"],
    s: ["s"],
    m: ["m"],
    "m²": ["mm²", "m²"],
    "": [""]
  };

  const SUB = ["₁", "₂", "₃"];

  const screens = {
    home: document.getElementById("screen-home"),
    exercise: document.getElementById("screen-exercise"),
    formules: document.getElementById("screen-formules"),
    result: document.getElementById("screen-result")
  };

  const typeButtons = document.querySelectorAll(".type-btn");
  const levelButtons = document.querySelectorAll(".level-btn");
  const startBtn = document.getElementById("start-btn");
  const formulesBtn = document.getElementById("formules-btn");
  const bestScoreEl = document.getElementById("best-score");

  const progressLabel = document.getElementById("progress-label");
  const scoreLabel = document.getElementById("score-label");
  const topicLabel = document.getElementById("topic-label");
  const questionContext = document.getElementById("question-context");
  const questionGiven = document.getElementById("question-given");
  const questionAsked = document.getElementById("question-asked");
  const diagramEl = document.getElementById("diagram");
  const choicesEl = document.getElementById("choices");
  const answerForm = document.getElementById("answer-form");
  const answerInput = document.getElementById("answer-input");
  const unitLabel = document.getElementById("unit-label");
  const inputHint = document.getElementById("input-hint");
  const feedbackEl = document.getElementById("feedback");
  const uitwerkingEl = document.getElementById("uitwerking");
  const uitwerkingSteps = document.getElementById("uitwerking-steps");
  const nextBtn = document.getElementById("next-btn");
  const quitBtn = document.getElementById("quit-btn");

  const resultText = document.getElementById("result-text");
  const retryBtn = document.getElementById("retry-btn");
  const homeBtn = document.getElementById("home-btn");
  const formulesQuitBtn = document.getElementById("formules-quit-btn");

  const state = {
    type: null,
    level: null,
    questionIndex: 0,
    score: 0,
    answered: false,
    current: null
  };

  // ---------- Hulpfuncties ----------

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function pick(arr) {
    return arr[randomInt(0, arr.length - 1)];
  }

  function shuffle(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = randomInt(0, i);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function r3(x) {
    return Number(x.toPrecision(3));
  }

  function superscript(n) {
    const map = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
    return String(n).split("").map((c) => map[c]).join("");
  }

  // Getal in Nederlandse notatie; heel groot/klein in machten van 10.
  function fmt(x, sig = 3) {
    if (x === 0) return "0";
    const exp = Math.floor(Math.log10(Math.abs(x)));
    if (exp >= -3 && exp < 6) {
      return String(Number(x.toPrecision(sig))).replace(".", ",");
    }
    let mantissa = Number((x / 10 ** exp).toPrecision(sig));
    let e = exp;
    if (Math.abs(mantissa) >= 10) {
      mantissa = Number((mantissa / 10).toPrecision(sig));
      e += 1;
    }
    return `${String(mantissa).replace(".", ",")}·10${superscript(e)}`;
  }

  const f = (x) => fmt(x);
  const sq = (x) => (f(x).includes("·") ? `(${f(x)})²` : `${f(x)}²`);

  function withUnit(x, unit) {
    return unit ? `${fmt(x)} ${unit}` : fmt(x);
  }

  function convert(value, from, to) {
    return (value * UNIT_FACTOR[from]) / UNIT_FACTOR[to];
  }

  function naturalUnit(value, si, list) {
    const sorted = [...list].sort((a, b) => UNIT_FACTOR[b] - UNIT_FACTOR[a]);
    return (
      sorted.find((u) => Math.abs(convert(value, si, u)) >= 1) ||
      sorted[sorted.length - 1]
    );
  }

  function readableUnit(value, si, list) {
    const candidates = list.filter((u) => {
      const x = Math.abs(convert(value, si, u));
      return x >= 1e-3 && x < 1e5;
    });
    return candidates.length ? pick(candidates) : naturalUnit(value, si, list);
  }

  // Kies in welke eenheid een grootheid getoond/gevraagd wordt. Hoe hoger het
  // niveau, hoe vaker voorvoegsels en afwijkende eenheden.
  function chooseUnit(value, si, units, level, role) {
    const list = units || DEFAULT_UNITS[si] || [si];
    const natural = naturalUnit(value, si, list);
    if (level === 0) {
      const abs = Math.abs(value);
      return list.includes(si) && abs >= 0.01 && abs < 1e4 ? si : natural;
    }
    if (role === "given") {
      return level === 2 && Math.random() < 0.3 ? readableUnit(value, si, list) : natural;
    }
    if (level === 1) {
      return Math.random() < 0.5 && list.includes(si) ? si : natural;
    }
    return readableUnit(value, si, list);
  }

  function makeCtx(level, context = "") {
    return { level, context, given: [], steps: [] };
  }

  // Voegt een gegeven toe (afgerond op 3 significante cijfers, in een gekozen
  // eenheid) en geeft de waarde in de rekeneenheid terug.
  function giveVal(ctx, label, si, value, units) {
    const unit = chooseUnit(value, si, units, ctx.level, "given");
    const shown = r3(convert(value, si, unit));
    const v = convert(shown, unit, si);
    const shownText = withUnit(shown, unit);
    ctx.given.push(`${label} = ${shownText}`);
    if (unit !== si) {
      ctx.steps.push(`${label} = ${shownText} = ${withUnit(v, si)}`);
    }
    return { v, shown: shownText };
  }

  function giveConst(ctx, label, si, value) {
    ctx.given.push(`${label} = ${fmt(value, 4)} ${si}`);
    return value;
  }

  function finish(ctx, label, name, si, result, extra = {}, units) {
    const unit = chooseUnit(result, si, units, ctx.level, "asked");
    if (unit !== si) {
      ctx.steps.push(
        `${label} = ${withUnit(result, si)} = ${withUnit(convert(result, si, unit), unit)}`
      );
    }
    return {
      context: ctx.context,
      given: ctx.given,
      asked: `Bereken <b>${label}</b> (${name})${unit ? ` in <b>${unit}</b>` : ""}.`,
      answer: convert(result, si, unit),
      unit,
      steps: ctx.steps,
      ...extra
    };
  }

  // Algemene opgave bij één formule: alle grootheden behalve één zijn gegeven.
  // spec.vars:   { key: { label, name, si, units? } }
  // spec.values: { key: waarde in si-eenheid }
  // spec.solve:  { key: [omgeschreven formule, invul-tekst(v), bereken(v)] }
  function formulaProblem(level, spec) {
    const ctx = makeCtx(level, spec.context || "");
    const unknown = pick(spec.unknowns || Object.keys(spec.solve));
    const v = {};

    Object.keys(spec.vars).forEach((key) => {
      if (key === unknown) return;
      const def = spec.vars[key];
      v[key] = giveVal(ctx, def.label, def.si, spec.values[key], def.units).v;
    });
    (spec.constants || []).forEach((c) => {
      v[c.key] = giveConst(ctx, c.label, c.si, c.value);
    });

    const def = spec.vars[unknown];
    const [expr, subst, compute] = spec.solve[unknown];
    ctx.steps.push(
      spec.formula && spec.formula !== expr
        ? `Formule: ${spec.formula} → ${expr}`
        : `Formule: ${expr}`
    );
    const result = compute(v);
    ctx.steps.push(`${subst(v)} = ${withUnit(result, def.si)}`);
    return finish(ctx, def.label, def.name, def.si, result, { diagram: spec.diagram }, def.askUnits || def.units);
  }

  // ---------- Schakelschema's (SVG) ----------

  function svg(w, h, body) {
    return `<svg class="circuit" viewBox="0 0 ${w} ${h}" role="img" aria-label="Schakelschema">${body}</svg>`;
  }

  function wire(x1, y1, x2, y2) {
    return `<line class="wire" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  }

  function resistor(cx, cy, label) {
    return (
      `<rect class="resistor" x="${cx - 24}" y="${cy - 9}" width="48" height="18"/>` +
      `<text class="label" x="${cx}" y="${cy - 15}">${label}</text>`
    );
  }

  function battery(cx, cy, label) {
    return (
      `<rect class="gap" x="${cx - 5}" y="${cy - 4}" width="10" height="8"/>` +
      `<line class="wire" x1="${cx - 5}" y1="${cy - 14}" x2="${cx - 5}" y2="${cy + 14}"/>` +
      `<line class="wire thick" x1="${cx + 5}" y1="${cy - 7}" x2="${cx + 5}" y2="${cy + 7}"/>` +
      `<text class="label" x="${cx}" y="${cy + 32}">${label}</text>`
    );
  }

  function dot(x, y) {
    return `<circle class="dot" cx="${x}" cy="${y}" r="3.5"/>`;
  }

  const rText = (i, shown) => `R${SUB[i]} = ${shown}`;
  const uText = (shown) => (shown ? `U = ${shown}` : "U");

  function seriesDiagram(shownRs, shownU) {
    const n = shownRs.length;
    const w = 80 + n * 120;
    const top = 40;
    const bottom = 130;
    let body =
      wire(20, top, w - 20, top) +
      wire(w - 20, top, w - 20, bottom) +
      wire(w - 20, bottom, 20, bottom) +
      wire(20, bottom, 20, top);
    shownRs.forEach((shown, i) => {
      body += resistor(20 + ((w - 40) * (i + 1)) / (n + 1), top, rText(i, shown));
    });
    body += battery(w / 2, bottom, uText(shownU));
    return svg(w, bottom + 45, body);
  }

  function parallelDiagram(shownRs, shownU) {
    const xL = 60;
    const xR = 260;
    const ys = shownRs.map((_, i) => 35 + i * 55);
    const yb = ys[ys.length - 1] + 55;
    let body = wire(xL, ys[0], xL, yb) + wire(xR, ys[0], xR, yb) + wire(xL, yb, xR, yb);
    shownRs.forEach((shown, i) => {
      body += wire(xL, ys[i], xR, ys[i]);
      if (i > 0) body += dot(xL, ys[i]) + dot(xR, ys[i]);
      body += resistor((xL + xR) / 2, ys[i], rText(i, shown));
    });
    body += battery((xL + xR) / 2, yb, uText(shownU));
    return svg(320, yb + 45, body);
  }

  function mixedDiagram(shownRs, shownU) {
    const top = 70;
    const xL = 180;
    const xR = 340;
    const yA = 35;
    const yB = 105;
    const bottom = 170;
    const body =
      wire(20, top, xL, top) +
      wire(xR, top, 380, top) +
      wire(380, top, 380, bottom) +
      wire(380, bottom, 20, bottom) +
      wire(20, bottom, 20, top) +
      wire(xL, yA, xL, yB) +
      wire(xR, yA, xR, yB) +
      wire(xL, yA, xR, yA) +
      wire(xL, yB, xR, yB) +
      dot(xL, top) +
      dot(xR, top) +
      resistor(100, top, rText(0, shownRs[0])) +
      resistor((xL + xR) / 2, yA, rText(1, shownRs[1])) +
      resistor((xL + xR) / 2, yB, rText(2, shownRs[2])) +
      battery(200, bottom, uText(shownU));
    return svg(400, bottom + 45, body);
  }

  // ---------- Vraaggeneratoren ----------

  const V_U = { label: "U", name: "spanning", si: "V" };
  const V_I = { label: "I", name: "stroomsterkte", si: "A" };
  const V_R = { label: "R", name: "weerstand", si: "Ω" };
  const V_P = { label: "P", name: "vermogen", si: "W" };
  const V_E = { label: "E", name: "energie", si: "J" };
  const V_Q = { label: "Q", name: "lading", si: "C" };
  const V_T = { label: "t", name: "tijd", si: "s", units: ["h", "min", "s"] };
  const V_G = { label: "G", name: "geleidbaarheid", si: "S" };

  function genOhm(l) {
    let I;
    let R;
    if (l === 0) {
      R = pick([2, 4, 5, 6, 8, 10, 12, 15, 20, 25, 40, 50, 100]);
      I = pick([0.5, 1, 1.5, 2, 2.5, 3, 4, 5]);
    } else {
      [I, R] = pick([
        () => [pick([0.5, 1, 2, 2.5, 4, 5, 8, 12, 20]) * 1e-3, pick([1, 1.5, 2.2, 3.3, 4.7, 6.8, 10]) * 1e3],
        () => [pick([15, 25, 40, 60, 120, 250, 400]) * 1e-3, pick([10, 15, 22, 33, 47, 68, 100])],
        () => [pick([2, 5, 10, 20, 50]) * 1e-6, pick([1, 2.2, 4.7, 10]) * 1e6]
      ])();
    }
    return formulaProblem(l, {
      formula: "U = I · R",
      vars: { U: V_U, I: V_I, R: V_R },
      values: { U: I * R, I, R },
      solve: {
        U: ["U = I · R", (v) => `U = ${f(v.I)} · ${f(v.R)}`, (v) => v.I * v.R],
        I: ["I = U / R", (v) => `I = ${f(v.U)} / ${f(v.R)}`, (v) => v.U / v.R],
        R: ["R = U / I", (v) => `R = ${f(v.U)} / ${f(v.I)}`, (v) => v.U / v.I]
      }
    });
  }

  function genVermogen(l) {
    const variants = l === 0 ? ["UI"] : ["UI", "I2R", "U2R"];
    if (l === 2) variants.push("lamp");
    const variant = pick(variants);

    const U = l === 0 ? pick([1.5, 3, 4.5, 6, 9, 12, 24]) : pick([1.5, 3.7, 5, 9, 12, 24, 230]);
    const I = l === 0 ? pick([0.1, 0.2, 0.25, 0.5, 1, 1.5, 2, 4]) : pick([0.02, 0.05, 0.15, 0.3, 0.45, 1.2, 2.5, 8.7]);
    const R = pick([4.7, 10, 22, 47, 100, 220, 1000, 2200, 4700]);

    if (variant === "UI") {
      return formulaProblem(l, {
        formula: "P = U · I",
        vars: { P: V_P, U: V_U, I: V_I },
        values: { P: U * I, U, I },
        solve: {
          P: ["P = U · I", (v) => `P = ${f(v.U)} · ${f(v.I)}`, (v) => v.U * v.I],
          U: ["U = P / I", (v) => `U = ${f(v.P)} / ${f(v.I)}`, (v) => v.P / v.I],
          I: ["I = P / U", (v) => `I = ${f(v.P)} / ${f(v.U)}`, (v) => v.P / v.U]
        }
      });
    }

    if (variant === "I2R") {
      const Ir = pick([0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.25]);
      return formulaProblem(l, {
        formula: "P = I² · R",
        vars: { P: V_P, I: V_I, R: V_R },
        values: { P: Ir * Ir * R, I: Ir, R },
        solve: {
          P: ["P = I² · R", (v) => `P = ${sq(v.I)} · ${f(v.R)}`, (v) => v.I * v.I * v.R],
          I: ["I = √(P / R)", (v) => `I = √(${f(v.P)} / ${f(v.R)})`, (v) => Math.sqrt(v.P / v.R)],
          R: ["R = P / I²", (v) => `R = ${f(v.P)} / ${sq(v.I)}`, (v) => v.P / (v.I * v.I)]
        }
      });
    }

    if (variant === "U2R") {
      return formulaProblem(l, {
        formula: "P = U² / R",
        vars: { P: V_P, U: V_U, R: V_R },
        values: { P: (U * U) / R, U, R },
        solve: {
          P: ["P = U² / R", (v) => `P = ${sq(v.U)} / ${f(v.R)}`, (v) => (v.U * v.U) / v.R],
          U: ["U = √(P · R)", (v) => `U = √(${f(v.P)} · ${f(v.R)})`, (v) => Math.sqrt(v.P * v.R)],
          R: ["R = U² / P", (v) => `R = ${sq(v.U)} / ${f(v.P)}`, (v) => (v.U * v.U) / v.P]
        }
      });
    }

    // Lamp met opschrift op een andere spanning; R constant.
    const [Un, Pn] = pick([[6, 3], [12, 24], [12, 36], [24, 48], [6, 1.8], [230, 100], [230, 60]]);
    const ctx = makeCtx(
      l,
      "Een lamp is gemaakt voor U<sub>n</sub> en P<sub>n</sub>. Hij wordt aangesloten op spanning U. Neem aan dat de weerstand constant is."
    );
    const un = giveVal(ctx, "U<sub>n</sub>", "V", Un);
    const pn = giveVal(ctx, "P<sub>n</sub>", "W", Pn);
    const u = giveVal(ctx, "U", "V", Un * pick([0.5, 0.6, 0.75, 0.8]));
    const Rl = (un.v * un.v) / pn.v;
    ctx.steps.push(`R = U<sub>n</sub>² / P<sub>n</sub> = ${sq(un.v)} / ${f(pn.v)} = ${f(Rl)} Ω`);
    const P = (u.v * u.v) / Rl;
    ctx.steps.push(`P = U² / R = ${sq(u.v)} / ${f(Rl)} = ${f(P)} W`);
    return finish(ctx, "P", "vermogen", "W", P);
  }

  function genEnergie(l) {
    const variant = l === 0 ? pick(["J", "kWh"]) : pick(["J", "kWh", "UQ", ...(l === 2 ? ["UIt"] : [])]);

    if (variant === "J") {
      const P = l === 0 ? pick([5, 10, 20, 40, 60, 100, 500]) : pick([0.8, 2.2, 9, 60, 1500, 2000, 3500]);
      const t = l === 0 ? pick([10, 20, 30, 60, 120, 300]) : pick([45, 90, 300, 600, 1800, 5400]);
      return formulaProblem(l, {
        formula: "E = P · t",
        vars: { E: V_E, P: V_P, t: V_T },
        values: { E: P * t, P, t },
        solve: {
          E: ["E = P · t", (v) => `E = ${f(v.P)} · ${f(v.t)}`, (v) => v.P * v.t],
          P: ["P = E / t", (v) => `P = ${f(v.E)} / ${f(v.t)}`, (v) => v.E / v.t],
          t: ["t = E / P", (v) => `t = ${f(v.E)} / ${f(v.P)}`, (v) => v.E / v.P]
        }
      });
    }

    if (variant === "kWh") {
      const P = l === 0 ? pick([0.1, 0.5, 1, 1.5, 2, 2.2]) : pick([0.06, 0.15, 0.8, 1.2, 2.2, 3.5]);
      const t = l === 0 ? pick([0.5, 1, 2, 3, 4, 8]) : pick([0.25, 0.5, 1.5, 2.5, 6]);
      return formulaProblem(l, {
        context: "Reken met kW en h: dan komt de energie in kWh.",
        formula: "E = P · t",
        vars: {
          E: { label: "E", name: "energie", si: "kWh", units: ["kWh"] },
          P: { label: "P", name: "vermogen", si: "kW", units: ["kW", "W"] },
          t: { label: "t", name: "tijd", si: "h", units: ["h", "min"] }
        },
        values: { E: P * t, P, t },
        solve: {
          E: ["E = P · t", (v) => `E = ${f(v.P)} · ${f(v.t)}`, (v) => v.P * v.t],
          P: ["P = E / t", (v) => `P = ${f(v.E)} / ${f(v.t)}`, (v) => v.E / v.t],
          t: ["t = E / P", (v) => `t = ${f(v.E)} / ${f(v.P)}`, (v) => v.E / v.P]
        }
      });
    }

    if (variant === "UQ") {
      const U = pick([1.5, 4.5, 9, 12, 230]);
      const Q = pick([0.5, 2, 15, 120, 3600]);
      return formulaProblem(l, {
        formula: "U = E / Q",
        vars: { U: V_U, E: V_E, Q: V_Q },
        values: { U, E: U * Q, Q },
        solve: {
          U: ["U = E / Q", (v) => `U = ${f(v.E)} / ${f(v.Q)}`, (v) => v.E / v.Q],
          E: ["E = U · Q", (v) => `E = ${f(v.U)} · ${f(v.Q)}`, (v) => v.U * v.Q],
          Q: ["Q = E / U", (v) => `Q = ${f(v.E)} / ${f(v.U)}`, (v) => v.E / v.U]
        }
      });
    }

    const U = pick([3.7, 6, 12, 230]);
    const I = pick([0.15, 0.4, 1.5, 2.5, 8]);
    const t = pick([30, 120, 600, 1800, 7200]);
    return formulaProblem(l, {
      formula: "E = U · I · t",
      vars: { E: V_E, U: V_U, I: V_I, t: V_T },
      values: { E: U * I * t, U, I, t },
      unknowns: ["E", "I", "t"],
      solve: {
        E: ["E = U · I · t", (v) => `E = ${f(v.U)} · ${f(v.I)} · ${f(v.t)}`, (v) => v.U * v.I * v.t],
        I: ["I = E / (U · t)", (v) => `I = ${f(v.E)} / (${f(v.U)} · ${f(v.t)})`, (v) => v.E / (v.U * v.t)],
        t: ["t = E / (U · I)", (v) => `t = ${f(v.E)} / (${f(v.U)} · ${f(v.I)})`, (v) => v.E / (v.U * v.I)]
      }
    });
  }

  function genLading(l) {
    const variant = l === 0 ? "QIt" : pick(["QIt", "n", ...(l === 2 ? ["accu"] : [])]);

    if (variant === "n") {
      const Q = pick([2.5e-6, 4e-3, 0.08, 1.5, 12]);
      return formulaProblem(l, {
        formula: "n = Q / e",
        vars: { n: { label: "n", name: "aantal elektronen", si: "" }, Q: V_Q },
        values: { n: Q / E_CHARGE, Q },
        constants: [{ key: "e", label: "e", si: "C", value: E_CHARGE }],
        solve: {
          n: ["n = Q / e", (v) => `n = ${f(v.Q)} / ${fmt(v.e, 4)}`, (v) => v.Q / v.e],
          Q: ["Q = n · e", (v) => `Q = ${f(v.n)} · ${fmt(v.e, 4)}`, (v) => v.n * v.e]
        }
      });
    }

    if (variant === "accu") {
      const Q = pick([2000, 3000, 4000, 5000]) * 3.6;
      const I = pick([0.1, 0.2, 0.25, 0.5]);
      return formulaProblem(l, {
        context: "De capaciteit van een accu is de lading die hij kan leveren.",
        formula: "Q = I · t",
        vars: { Q: { ...V_Q, units: ["mAh", "C"] }, I: V_I, t: V_T },
        values: { Q, I, t: Q / I },
        unknowns: ["I", "t"],
        solve: {
          I: ["I = Q / t", (v) => `I = ${f(v.Q)} / ${f(v.t)}`, (v) => v.Q / v.t],
          t: ["t = Q / I", (v) => `t = ${f(v.Q)} / ${f(v.I)}`, (v) => v.Q / v.I]
        }
      });
    }

    const I = l === 0 ? pick([0.5, 1, 2, 2.5, 3, 4]) : pick([0.015, 0.08, 0.25, 0.4, 1.2, 3.5]);
    const t = l === 0 ? pick([5, 10, 20, 30, 60, 120]) : pick([20, 90, 300, 600, 3600]);
    return formulaProblem(l, {
      formula: "I = Q / t",
      vars: { Q: V_Q, I: V_I, t: V_T },
      values: { Q: I * t, I, t },
      solve: {
        Q: ["Q = I · t", (v) => `Q = ${f(v.I)} · ${f(v.t)}`, (v) => v.I * v.t],
        I: ["I = Q / t", (v) => `I = ${f(v.Q)} / ${f(v.t)}`, (v) => v.Q / v.t],
        t: ["t = Q / I", (v) => `t = ${f(v.Q)} / ${f(v.I)}`, (v) => v.Q / v.I]
      }
    });
  }

  const SERIE_POOL_EASY = [10, 20, 30, 40, 50, 60, 80, 100];
  const SERIE_POOL = [100, 150, 220, 330, 470, 680, 1000, 1500, 2200, 4700];

  function genSerie(l) {
    const ctx = makeCtx(l);
    const pool = l === 0 ? SERIE_POOL_EASY : SERIE_POOL;
    const variant = l === 0 ? pick(["Rv", "I"]) : l === 1 ? pick(["I", "Uk"]) : pick(["Pk", "deler"]);
    const Ubron = pick(l === 0 ? [6, 9, 12] : [4.5, 6, 9, 12, 24]);

    if (variant === "deler") {
      const R1 = pick(pool);
      const R2 = pick(pool);
      const u = giveVal(ctx, "U<sub>bron</sub>", "V", Ubron);
      const r1 = giveVal(ctx, "R₁", "Ω", R1);
      const u2 = giveVal(ctx, "U₂", "V", (Ubron * R2) / (R1 + R2));
      const U1 = u.v - u2.v;
      ctx.steps.push(`U₁ = U<sub>bron</sub> − U₂ = ${f(u.v)} − ${f(u2.v)} = ${f(U1)} V`);
      const I = U1 / r1.v;
      ctx.steps.push(`I = U₁ / R₁ = ${f(U1)} / ${f(r1.v)} = ${f(I)} A (in serie overal gelijk)`);
      const R2c = u2.v / I;
      ctx.steps.push(`R₂ = U₂ / I = ${f(u2.v)} / ${f(I)} = ${f(R2c)} Ω`);
      return finish(ctx, "R₂", "weerstand", "Ω", R2c, { diagram: seriesDiagram([r1.shown, "?"], u.shown) });
    }

    const n = l === 0 ? 2 : 3;
    const u = giveVal(ctx, "U<sub>bron</sub>", "V", Ubron);
    const rs = Array.from({ length: n }, (_, i) => giveVal(ctx, `R${SUB[i]}`, "Ω", pick(pool)));
    const diagram = seriesDiagram(rs.map((r) => r.shown), u.shown);
    const Rv = rs.reduce((sum, r) => sum + r.v, 0);
    ctx.steps.push(
      `Serie: R<sub>v</sub> = ${rs.map((_, i) => `R${SUB[i]}`).join(" + ")} = ${rs.map((r) => f(r.v)).join(" + ")} = ${f(Rv)} Ω`
    );
    if (variant === "Rv") {
      return finish(ctx, "R<sub>v</sub>", "vervangingsweerstand", "Ω", Rv, { diagram });
    }
    const I = u.v / Rv;
    ctx.steps.push(`I = U<sub>bron</sub> / R<sub>v</sub> = ${f(u.v)} / ${f(Rv)} = ${f(I)} A`);
    if (variant === "I") {
      return finish(ctx, "I", "stroomsterkte", "A", I, { diagram });
    }
    const k = randomInt(0, n - 1);
    const Rk = rs[k].v;
    if (variant === "Uk") {
      const Uk = I * Rk;
      ctx.steps.push(`U${SUB[k]} = I · R${SUB[k]} = ${f(I)} · ${f(Rk)} = ${f(Uk)} V`);
      return finish(ctx, `U${SUB[k]}`, `spanning over R${SUB[k]}`, "V", Uk, { diagram });
    }
    const Pk = I * I * Rk;
    ctx.steps.push(`P${SUB[k]} = I² · R${SUB[k]} = ${sq(I)} · ${f(Rk)} = ${f(Pk)} W`);
    return finish(ctx, `P${SUB[k]}`, `vermogen van R${SUB[k]}`, "W", Pk, { diagram });
  }

  const PARALLEL_PAIRS = [[6, 3], [12, 4], [20, 5], [10, 10], [30, 15], [60, 20], [12, 6], [24, 8], [40, 10], [100, 25], [150, 100]];
  const PARALLEL_POOL = [10, 20, 30, 40, 50, 60, 100, 120, 150];

  function parallelRv(ctx, rs) {
    const labels = rs.map((_, i) => `1/R${SUB[i]}`).join(" + ");
    const values = rs.map((r) => `1/${f(r.v)}`).join(" + ");
    const Rv = 1 / rs.reduce((sum, r) => sum + 1 / r.v, 0);
    ctx.steps.push(`Parallel: 1/R<sub>v</sub> = ${labels} = ${values}`);
    ctx.steps.push(`R<sub>v</sub> = ${f(Rv)} Ω`);
    return Rv;
  }

  function genParallel(l) {
    const ctx = makeCtx(l);
    const scale = l === 0 ? 1 : pick([1, 1000]);
    const U = pick(l === 0 ? [6, 12, 24] : [4.5, 6, 9, 12, 24, 230]);
    const variant = l === 0 ? pick(["Rv", "Itot"]) : l === 1 ? pick(["Rv", "Itot", "Ik"]) : pick(["R2", "Ptot", "deler"]);

    if (variant === "R2") {
      const [R1, R2] = shuffle(pick(PARALLEL_PAIRS)).map((r) => r * scale);
      const rv = giveVal(ctx, "R<sub>v</sub>", "Ω", (R1 * R2) / (R1 + R2));
      const r1 = giveVal(ctx, "R₁", "Ω", R1);
      const inv = 1 / rv.v - 1 / r1.v;
      ctx.steps.push(`Parallel: 1/R₂ = 1/R<sub>v</sub> − 1/R₁ = 1/${f(rv.v)} − 1/${f(r1.v)} = ${f(inv)} Ω⁻¹`);
      const R2c = 1 / inv;
      ctx.steps.push(`R₂ = 1 / ${f(inv)} = ${f(R2c)} Ω`);
      return finish(ctx, "R₂", "weerstand", "Ω", R2c, { diagram: parallelDiagram([r1.shown, "?"], null) });
    }

    if (variant === "deler") {
      const [R1, R2] = pick(PARALLEL_PAIRS).map((r) => r * scale);
      const itot = giveVal(ctx, "I<sub>tot</sub>", "A", pick([0.03, 0.12, 0.5, 1.5, 3]));
      const r1 = giveVal(ctx, "R₁", "Ω", R1);
      const r2 = giveVal(ctx, "R₂", "Ω", R2);
      const Rv = parallelRv(ctx, [r1, r2]);
      const Uc = itot.v * Rv;
      ctx.steps.push(`U = I<sub>tot</sub> · R<sub>v</sub> = ${f(itot.v)} · ${f(Rv)} = ${f(Uc)} V (parallel: overal gelijk)`);
      const I2 = Uc / r2.v;
      ctx.steps.push(`I₂ = U / R₂ = ${f(Uc)} / ${f(r2.v)} = ${f(I2)} A`);
      return finish(ctx, "I₂", "stroomsterkte door R₂", "A", I2, { diagram: parallelDiagram([r1.shown, r2.shown], null) });
    }

    const values = l === 0 || variant === "Ptot"
      ? pick(PARALLEL_PAIRS)
      : shuffle(PARALLEL_POOL).slice(0, 3);
    const u = giveVal(ctx, "U<sub>bron</sub>", "V", U);
    const rs = values.map((r, i) => giveVal(ctx, `R${SUB[i]}`, "Ω", r * scale));
    const diagram = parallelDiagram(rs.map((r) => r.shown), u.shown);

    if (variant === "Ik") {
      const k = randomInt(0, rs.length - 1);
      ctx.steps.push("Parallel: over elke tak staat de bronspanning.");
      const Ik = u.v / rs[k].v;
      ctx.steps.push(`I${SUB[k]} = U / R${SUB[k]} = ${f(u.v)} / ${f(rs[k].v)} = ${f(Ik)} A`);
      return finish(ctx, `I${SUB[k]}`, `stroomsterkte door R${SUB[k]}`, "A", Ik, { diagram });
    }

    const Rv = parallelRv(ctx, rs);
    if (variant === "Rv") {
      return finish(ctx, "R<sub>v</sub>", "vervangingsweerstand", "Ω", Rv, { diagram });
    }
    if (variant === "Itot") {
      const I = u.v / Rv;
      ctx.steps.push(`I<sub>tot</sub> = U / R<sub>v</sub> = ${f(u.v)} / ${f(Rv)} = ${f(I)} A`);
      return finish(ctx, "I<sub>tot</sub>", "stroomsterkte door de bron", "A", I, { diagram });
    }
    const P = (u.v * u.v) / Rv;
    ctx.steps.push(`P<sub>tot</sub> = U² / R<sub>v</sub> = ${sq(u.v)} / ${f(Rv)} = ${f(P)} W`);
    return finish(ctx, "P<sub>tot</sub>", "totaal vermogen", "W", P, { diagram });
  }

  function genGemengd(l) {
    const ctx = makeCtx(l, "R₁ staat in serie met de parallelschakeling van R₂ en R₃.");
    const scale = l === 0 ? 1 : pick([1, 1000]);
    const [R2, R3] = pick(PARALLEL_PAIRS);
    const R1 = pick([5, 10, 15, 20, 25, 40, 50]);
    const u = giveVal(ctx, "U<sub>bron</sub>", "V", pick([6, 9, 12, 24]));
    const rs = [R1, R2, R3].map((r, i) => giveVal(ctx, `R${SUB[i]}`, "Ω", r * scale));
    const diagram = mixedDiagram(rs.map((r) => r.shown), u.shown);

    const Rp = 1 / (1 / rs[1].v + 1 / rs[2].v);
    ctx.steps.push(`Parallel: 1/R<sub>23</sub> = 1/${f(rs[1].v)} + 1/${f(rs[2].v)} → R<sub>23</sub> = ${f(Rp)} Ω`);
    const Rv = rs[0].v + Rp;
    ctx.steps.push(`Serie: R<sub>v</sub> = R₁ + R<sub>23</sub> = ${f(rs[0].v)} + ${f(Rp)} = ${f(Rv)} Ω`);
    if (l === 0) {
      return finish(ctx, "R<sub>v</sub>", "vervangingsweerstand", "Ω", Rv, { diagram });
    }
    const I = u.v / Rv;
    ctx.steps.push(`I<sub>tot</sub> = U / R<sub>v</sub> = ${f(u.v)} / ${f(Rv)} = ${f(I)} A`);
    if (l === 1) {
      return finish(ctx, "I<sub>tot</sub>", "stroomsterkte door de bron", "A", I, { diagram });
    }
    const U23 = I * Rp;
    ctx.steps.push(`U<sub>23</sub> = I<sub>tot</sub> · R<sub>23</sub> = ${f(I)} · ${f(Rp)} = ${f(U23)} V`);
    if (Math.random() < 0.5) {
      ctx.steps.push("R₂ en R₃ staan parallel, dus U₂ = U<sub>23</sub>");
      return finish(ctx, "U₂", "spanning over R₂", "V", U23, { diagram });
    }
    const I3 = U23 / rs[2].v;
    ctx.steps.push(`I₃ = U<sub>23</sub> / R₃ = ${f(U23)} / ${f(rs[2].v)} = ${f(I3)} A`);
    return finish(ctx, "I₃", "stroomsterkte door R₃", "A", I3, { diagram });
  }

  function genGeleidbaarheid(l) {
    const variant = l === 0 ? "GR" : l === 1 ? pick(["GR", "GUI"]) : pick(["GUI", "Gpar", "Gserie"]);

    if (variant === "GR") {
      const R = l === 0 ? pick([2, 4, 5, 10, 20, 25, 50]) : pick([47, 100, 220, 1000, 2200, 4.7e4, 1e6]);
      return formulaProblem(l, {
        formula: "G = 1 / R",
        vars: { G: V_G, R: V_R },
        values: { G: 1 / R, R },
        solve: {
          G: ["G = 1 / R", (v) => `G = 1 / ${f(v.R)}`, (v) => 1 / v.R],
          R: ["R = 1 / G", (v) => `R = 1 / ${f(v.G)}`, (v) => 1 / v.G]
        }
      });
    }

    if (variant === "GUI") {
      const U = pick([2, 5, 6, 10, 12, 230]);
      const I = pick([0.01, 0.02, 0.05, 0.12, 0.3, 1.5]);
      return formulaProblem(l, {
        formula: "G = I / U",
        vars: { G: V_G, I: V_I, U: V_U },
        values: { G: I / U, I, U },
        solve: {
          G: ["G = I / U", (v) => `G = ${f(v.I)} / ${f(v.U)}`, (v) => v.I / v.U],
          I: ["I = G · U", (v) => `I = ${f(v.G)} · ${f(v.U)}`, (v) => v.G * v.U],
          U: ["U = I / G", (v) => `U = ${f(v.I)} / ${f(v.G)}`, (v) => v.I / v.G]
        }
      });
    }

    const pool = [2, 5, 10, 20, 25, 40, 50].map((g) => g * 1e-3);
    if (variant === "Gserie") {
      const ctx = makeCtx(l, "Twee geleiders staan in serie.");
      const gs = shuffle(pool).slice(0, 2).map((g, i) => giveVal(ctx, `G${SUB[i]}`, "S", g));
      const inv = 1 / gs[0].v + 1 / gs[1].v;
      ctx.steps.push(`Serie: 1/G<sub>v</sub> = 1/G₁ + 1/G₂ = 1/${f(gs[0].v)} + 1/${f(gs[1].v)} = ${f(inv)} S⁻¹`);
      const Gv = 1 / inv;
      ctx.steps.push(`G<sub>v</sub> = 1 / ${f(inv)} = ${f(Gv)} S`);
      return finish(ctx, "G<sub>v</sub>", "vervangingsgeleidbaarheid", "S", Gv);
    }

    const ctx = makeCtx(l, "Drie geleiders staan parallel op een spanningsbron.");
    const u = giveVal(ctx, "U", "V", pick([6, 12, 24]));
    const gs = shuffle(pool).slice(0, 3).map((g, i) => giveVal(ctx, `G${SUB[i]}`, "S", g));
    const Gv = gs.reduce((sum, g) => sum + g.v, 0);
    ctx.steps.push(`Parallel: G<sub>v</sub> = G₁ + G₂ + G₃ = ${gs.map((g) => f(g.v)).join(" + ")} = ${f(Gv)} S`);
    const I = Gv * u.v;
    ctx.steps.push(`I<sub>tot</sub> = G<sub>v</sub> · U = ${f(Gv)} · ${f(u.v)} = ${f(I)} A`);
    return finish(ctx, "I<sub>tot</sub>", "stroomsterkte door de bron", "A", I);
  }

  const MATERIALS = [
    { naam: "koper", rho: 17e-9 },
    { naam: "aluminium", rho: 27e-9 },
    { naam: "zilver", rho: 16e-9 },
    { naam: "constantaan", rho: 0.45e-6 },
    { naam: "nichroom", rho: 1.1e-6 }
  ];

  function genSoortelijk(l) {
    const mat = pick(MATERIALS);
    const lengte = pick([0.5, 1, 2, 5, 10, 25, 100]);

    if (l === 2 && Math.random() < 0.5) {
      const ctx = makeCtx(l, `Een ronde draad van ${mat.naam}.`);
      const rho = giveVal(ctx, "ρ", "Ω·m", mat.rho, ["Ω·m"]);
      const len = giveVal(ctx, "ℓ", "m", lengte, ["m", "cm"]);
      const d = giveVal(ctx, "d", "m", pick([0.2, 0.3, 0.5, 0.8, 1.0]) * 1e-3, ["mm"]);
      const A = 0.25 * Math.PI * d.v * d.v;
      ctx.steps.push(`A = ¼ · π · d² = ¼ · π · ${sq(d.v)} = ${f(A)} m²`);
      ctx.steps.push("Formule: R = ρ · ℓ / A");
      const R = (rho.v * len.v) / A;
      ctx.steps.push(`R = ${f(rho.v)} · ${f(len.v)} / ${f(A)} = ${f(R)} Ω`);
      return finish(ctx, "R", "weerstand", "Ω", R);
    }

    const A = pick([0.1, 0.25, 0.5, 0.75, 1.5, 2.5]) * 1e-6;
    return formulaProblem(l, {
      context: `Een draad van ${mat.naam}.`,
      formula: "R = ρ · ℓ / A",
      vars: {
        R: V_R,
        rho: { label: "ρ", name: "soortelijke weerstand", si: "Ω·m", units: ["Ω·m"] },
        len: { label: "ℓ", name: "lengte", si: "m", units: ["km", "m", "cm"] },
        A: { label: "A", name: "doorsnede", si: "m²", units: ["mm²", "m²"] }
      },
      values: { R: (mat.rho * lengte) / A, rho: mat.rho, len: lengte, A },
      unknowns: l === 0 ? ["R"] : l === 1 ? ["R", "len", "A"] : ["len", "A", "rho"],
      solve: {
        R: ["R = ρ · ℓ / A", (v) => `R = ${f(v.rho)} · ${f(v.len)} / ${f(v.A)}`, (v) => (v.rho * v.len) / v.A],
        len: ["ℓ = R · A / ρ", (v) => `ℓ = ${f(v.R)} · ${f(v.A)} / ${f(v.rho)}`, (v) => (v.R * v.A) / v.rho],
        A: ["A = ρ · ℓ / R", (v) => `A = ${f(v.rho)} · ${f(v.len)} / ${f(v.R)}`, (v) => (v.rho * v.len) / v.R],
        rho: ["ρ = R · A / ℓ", (v) => `ρ = ${f(v.R)} · ${f(v.A)} / ${f(v.len)}`, (v) => (v.R * v.A) / v.len]
      }
    });
  }

  function genRendement(l) {
    const V_ETA = { label: "η", name: "rendement", si: "", units: ["%"] };

    if (l === 2 && Math.random() < 0.5) {
      const ctx = makeCtx(l, "Een elektromotor tilt een massa m op over een hoogte h.");
      let U, I, t, m, h, eta;
      do {
        U = pick([6, 12, 24]);
        I = pick([0.5, 1, 1.5, 2, 3]);
        t = pick([5, 10, 15, 20]);
        m = pick([0.5, 1, 2, 5, 10]);
        h = pick([0.5, 1, 1.5, 2, 3]);
        eta = (m * G_ACC * h) / (U * I * t);
      } while (eta < 0.2 || eta > 0.95);
      const u = giveVal(ctx, "U", "V", U);
      const i = giveVal(ctx, "I", "A", I);
      const tt = giveVal(ctx, "t", "s", t);
      const mm = giveVal(ctx, "m", "kg", m, ["kg"]);
      const hh = giveVal(ctx, "h", "m", h, ["m", "cm"]);
      giveConst(ctx, "g", "m/s²", G_ACC);
      const Ein = u.v * i.v * tt.v;
      const En = mm.v * G_ACC * hh.v;
      ctx.steps.push(`E<sub>in</sub> = U · I · t = ${f(u.v)} · ${f(i.v)} · ${f(tt.v)} = ${f(Ein)} J`);
      ctx.steps.push(`E<sub>nuttig</sub> = m · g · h = ${f(mm.v)} · 9,81 · ${f(hh.v)} = ${f(En)} J`);
      const res = En / Ein;
      ctx.steps.push(`η = E<sub>nuttig</sub> / E<sub>in</sub> = ${f(En)} / ${f(Ein)} = ${f(res)}`);
      return finish(ctx, "η", "rendement", "", res, {}, ["%"]);
    }

    if (l >= 1 && Math.random() < 0.5) {
      const P = pick([1800, 2000, 2200]);
      const t = pick([120, 150, 180, 240]);
      const eta = pick([0.8, 0.85, 0.9, 0.92]);
      return formulaProblem(l, {
        context: "Een waterkoker verwarmt water. E<sub>nuttig</sub> is de warmte die het water opneemt.",
        formula: "η = E<sub>nuttig</sub> / (P · t)",
        vars: {
          eta: V_ETA,
          En: { label: "E<sub>nuttig</sub>", name: "nuttige energie", si: "J" },
          P: V_P,
          t: V_T
        },
        values: { eta, En: eta * P * t, P, t },
        unknowns: ["eta", "En", "t"],
        solve: {
          eta: ["η = E<sub>nuttig</sub> / (P · t)", (v) => `η = ${f(v.En)} / (${f(v.P)} · ${f(v.t)})`, (v) => v.En / (v.P * v.t)],
          En: ["E<sub>nuttig</sub> = η · P · t", (v) => `E<sub>nuttig</sub> = ${f(v.eta)} · ${f(v.P)} · ${f(v.t)}`, (v) => v.eta * v.P * v.t],
          t: ["t = E<sub>nuttig</sub> / (η · P)", (v) => `t = ${f(v.En)} / (${f(v.eta)} · ${f(v.P)})`, (v) => v.En / (v.eta * v.P)]
        }
      });
    }

    const Pin = pick([40, 60, 100, 200, 500, 1000, 2500]);
    const eta = pick([0.2, 0.25, 0.4, 0.5, 0.6, 0.75, 0.8, 0.9]);
    return formulaProblem(l, {
      formula: "η = P<sub>nuttig</sub> / P<sub>in</sub>",
      vars: {
        eta: V_ETA,
        Pn: { label: "P<sub>nuttig</sub>", name: "nuttig vermogen", si: "W" },
        Pin: { label: "P<sub>in</sub>", name: "opgenomen vermogen", si: "W" }
      },
      values: { eta, Pn: eta * Pin, Pin },
      solve: {
        eta: ["η = P<sub>nuttig</sub> / P<sub>in</sub>", (v) => `η = ${f(v.Pn)} / ${f(v.Pin)}`, (v) => v.Pn / v.Pin],
        Pn: ["P<sub>nuttig</sub> = η · P<sub>in</sub>", (v) => `P<sub>nuttig</sub> = ${f(v.eta)} · ${f(v.Pin)}`, (v) => v.eta * v.Pin],
        Pin: ["P<sub>in</sub> = P<sub>nuttig</sub> / η", (v) => `P<sub>in</sub> = ${f(v.Pn)} / ${f(v.eta)}`, (v) => v.Pn / v.eta]
      }
    });
  }

  function genTransformator(l) {
    const V_N = (label, name) => ({ label, name, si: "" });
    const Up = l === 0 ? 230 : pick([230, 400, 10e3, 150e3]);

    if (l >= 1 && Math.random() < 0.5) {
      const Us = pick([6, 12, 24, 400]);
      const Is = pick([0.5, 1.5, 2, 5, 20]);
      return formulaProblem(l, {
        context: "De transformator is ideaal: P<sub>p</sub> = P<sub>s</sub>.",
        formula: "U<sub>p</sub> · I<sub>p</sub> = U<sub>s</sub> · I<sub>s</sub>",
        vars: {
          Up: { label: "U<sub>p</sub>", name: "primaire spanning", si: "V" },
          Ip: { label: "I<sub>p</sub>", name: "primaire stroomsterkte", si: "A" },
          Us: { label: "U<sub>s</sub>", name: "secundaire spanning", si: "V" },
          Is: { label: "I<sub>s</sub>", name: "secundaire stroomsterkte", si: "A" }
        },
        values: { Up, Ip: (Us * Is) / Up, Us, Is },
        unknowns: ["Ip", "Is"],
        solve: {
          Ip: ["I<sub>p</sub> = U<sub>s</sub> · I<sub>s</sub> / U<sub>p</sub>", (v) => `I<sub>p</sub> = ${f(v.Us)} · ${f(v.Is)} / ${f(v.Up)}`, (v) => (v.Us * v.Is) / v.Up],
          Is: ["I<sub>s</sub> = U<sub>p</sub> · I<sub>p</sub> / U<sub>s</sub>", (v) => `I<sub>s</sub> = ${f(v.Up)} · ${f(v.Ip)} / ${f(v.Us)}`, (v) => (v.Up * v.Ip) / v.Us]
        }
      });
    }

    const Np = pick([500, 1000, 1200, 2000, 4600]);
    const Ns = pick([20, 50, 100, 240, 3000]);
    return formulaProblem(l, {
      formula: "U<sub>p</sub> / U<sub>s</sub> = N<sub>p</sub> / N<sub>s</sub>",
      vars: {
        Up: { label: "U<sub>p</sub>", name: "primaire spanning", si: "V" },
        Us: { label: "U<sub>s</sub>", name: "secundaire spanning", si: "V" },
        Np: V_N("N<sub>p</sub>", "aantal primaire windingen"),
        Ns: V_N("N<sub>s</sub>", "aantal secundaire windingen")
      },
      values: { Up, Us: (Up * Ns) / Np, Np, Ns },
      unknowns: l === 0 ? ["Us"] : ["Us", "Ns", "Np", "Up"],
      solve: {
        Us: ["U<sub>s</sub> = U<sub>p</sub> · N<sub>s</sub> / N<sub>p</sub>", (v) => `U<sub>s</sub> = ${f(v.Up)} · ${f(v.Ns)} / ${f(v.Np)}`, (v) => (v.Up * v.Ns) / v.Np],
        Up: ["U<sub>p</sub> = U<sub>s</sub> · N<sub>p</sub> / N<sub>s</sub>", (v) => `U<sub>p</sub> = ${f(v.Us)} · ${f(v.Np)} / ${f(v.Ns)}`, (v) => (v.Us * v.Np) / v.Ns],
        Ns: ["N<sub>s</sub> = N<sub>p</sub> · U<sub>s</sub> / U<sub>p</sub>", (v) => `N<sub>s</sub> = ${f(v.Np)} · ${f(v.Us)} / ${f(v.Up)}`, (v) => (v.Np * v.Us) / v.Up],
        Np: ["N<sub>p</sub> = N<sub>s</sub> · U<sub>p</sub> / U<sub>s</sub>", (v) => `N<sub>p</sub> = ${f(v.Ns)} · ${f(v.Up)} / ${f(v.Us)}`, (v) => (v.Ns * v.Up) / v.Us]
      }
    });
  }

  const UNIT_FAMILIES = [
    { units: ["A", "mA", "μA"], easy: ["A", "mA"] },
    { units: ["V", "kV", "mV"], easy: ["V", "mV", "kV"] },
    { units: ["Ω", "kΩ", "MΩ"], easy: ["Ω", "kΩ"] },
    { units: ["W", "kW", "MW", "mW"], easy: ["W", "kW"] },
    { units: ["J", "kJ", "MJ"], easy: ["J", "kJ"] },
    { units: ["C", "mC", "μC"], easy: ["C", "mC"] },
    { units: ["S", "mS", "μS"], easy: ["S", "mS"] }
  ];

  const SPECIAL_CONVERSIONS = [
    ["kWh", "J"], ["kWh", "MJ"], ["MJ", "kWh"], ["J", "kWh"],
    ["mAh", "C"], ["Ah", "C"], ["C", "mAh"],
    ["mm²", "m²"], ["m²", "mm²"],
    ["h", "s"], ["min", "s"], ["s", "min"]
  ];

  function genEenheden(l) {
    let from;
    let to;
    if (l === 2 && Math.random() < 0.6) {
      [from, to] = pick(SPECIAL_CONVERSIONS);
    } else {
      const fam = pick(UNIT_FAMILIES);
      [from, to] = shuffle(l === 0 ? fam.easy : fam.units);
    }
    const factor = UNIT_FACTOR[from] / UNIT_FACTOR[to];
    const x = from === "m²" ? pick([1.5, 2.5, 0.75, 4]) * 1e-6 : pick([0.05, 0.25, 1.5, 2.2, 4.7, 12, 25, 330, 750]);
    const answer = x * factor;
    return {
      context: "Reken om naar de gevraagde eenheid.",
      given: [`${fmt(x)} ${from}`],
      asked: `Hoeveel is dit in <b>${to}</b>?`,
      answer,
      unit: to,
      steps: [
        `1 ${from} = ${fmt(factor, 4)} ${to}`,
        `${fmt(x)} ${from} = ${fmt(x)} × ${fmt(factor, 4)} ${to} = ${fmt(answer)} ${to}`
      ]
    };
  }

  const QUANTITY_UNITS = [
    ["stroomsterkte (I)", "A (ampère)"],
    ["spanning (U)", "V (volt)"],
    ["weerstand (R)", "Ω (ohm)"],
    ["vermogen (P)", "W (watt)"],
    ["energie (E)", "J (joule)"],
    ["lading (Q)", "C (coulomb)"],
    ["geleidbaarheid (G)", "S (siemens)"],
    ["soortelijke weerstand (ρ)", "Ω·m (ohm·meter)"]
  ];

  const REARRANGEMENTS = [
    ["U = I · R", "I", "I = U / R", ["I = R / U", "I = U · R", "I = U − R"]],
    ["U = I · R", "R", "R = U / I", ["R = I / U", "R = U · I", "R = U − I"]],
    ["P = U · I", "U", "U = P / I", ["U = I / P", "U = P · I", "U = P − I"]],
    ["P = I² · R", "I", "I = √(P / R)", ["I = P / R²", "I = √(P · R)", "I = P / (2 · R)"]],
    ["P = U² / R", "U", "U = √(P · R)", ["U = √(P / R)", "U = P · R²", "U = P · R / 2"]],
    ["P = U² / R", "R", "R = U² / P", ["R = P / U²", "R = P · U²", "R = U / P²"]],
    ["E = P · t", "t", "t = E / P", ["t = P / E", "t = E · P", "t = E − P"]],
    ["I = Q / t", "t", "t = Q / I", ["t = I / Q", "t = Q · I", "t = I · Q²"]],
    ["U = E / Q", "E", "E = U · Q", ["E = U / Q", "E = Q / U", "E = U + Q"]],
    ["R = ρ · ℓ / A", "A", "A = ρ · ℓ / R", ["A = R · ℓ / ρ", "A = R · ρ / ℓ", "A = ρ / (R · ℓ)"]],
    ["R = ρ · ℓ / A", "ℓ", "ℓ = R · A / ρ", ["ℓ = ρ · A / R", "ℓ = R · ρ / A", "ℓ = A / (ρ · R)"]],
    ["U<sub>p</sub> / U<sub>s</sub> = N<sub>p</sub> / N<sub>s</sub>", "N<sub>s</sub>",
      "N<sub>s</sub> = N<sub>p</sub> · U<sub>s</sub> / U<sub>p</sub>",
      ["N<sub>s</sub> = N<sub>p</sub> · U<sub>p</sub> / U<sub>s</sub>", "N<sub>s</sub> = U<sub>p</sub> · U<sub>s</sub> / N<sub>p</sub>", "N<sub>s</sub> = N<sub>p</sub> / (U<sub>p</sub> · U<sub>s</sub>)"]],
    ["η = P<sub>nuttig</sub> / P<sub>in</sub>", "P<sub>in</sub>", "P<sub>in</sub> = P<sub>nuttig</sub> / η",
      ["P<sub>in</sub> = η · P<sub>nuttig</sub>", "P<sub>in</sub> = η / P<sub>nuttig</sub>", "P<sub>in</sub> = P<sub>nuttig</sub> − η"]]
  ];

  const UNIT_DERIVATIONS = [
    ["V · A", "W", "P = U · I"],
    ["V / A", "Ω", "R = U / I"],
    ["A · s", "C", "Q = I · t"],
    ["W · s", "J", "E = P · t"],
    ["J / C", "V", "U = E / Q"],
    ["J / s", "W", "P = E / t"],
    ["V² / Ω", "W", "P = U² / R"],
    ["A² · Ω", "W", "P = I² · R"],
    ["A / V", "S", "G = I / U"],
    ["1 / Ω", "S", "G = 1 / R"],
    ["Ω · m² / m", "Ω·m", "ρ = R · A / ℓ"],
    ["kW · h", "kWh", "E = P · t"],
    ["C / s", "A", "I = Q / t"],
    ["V · C", "J", "E = U · Q"]
  ];

  function genFormules(l) {
    const variant = l === 0 ? pick(["unit", "quantity"]) : l === 1 ? "rearrange" : pick(["rearrange", "derive", "derive"]);

    if (variant === "unit" || variant === "quantity") {
      const [quantity, unit] = pick(QUANTITY_UNITS);
      const others = shuffle(QUANTITY_UNITS.filter(([q]) => q !== quantity)).slice(0, 3);
      if (variant === "unit") {
        return {
          context: `Wat is de eenheid van de <b>${quantity}</b>?`,
          choices: shuffle([unit, ...others.map(([, u]) => u)]),
          correct: unit,
          steps: [`De ${quantity} meet je in ${unit}.`]
        };
      }
      return {
        context: `Van welke grootheid is <b>${unit}</b> de eenheid?`,
        choices: shuffle([quantity, ...others.map(([q]) => q)]),
        correct: quantity,
        steps: [`${unit} is de eenheid van de ${quantity}.`]
      };
    }

    if (variant === "rearrange") {
      const [formula, target, correct, wrong] = pick(REARRANGEMENTS);
      return {
        context: `Schrijf <b>${formula}</b> om naar <b>${target}</b>.`,
        choices: shuffle([correct, ...wrong]),
        correct,
        steps: [`${formula} → ${correct}`, "Controle: vul de juiste formule terug in de oorspronkelijke formule in."]
      };
    }

    const [expr, unit, formula] = pick(UNIT_DERIVATIONS);
    const pool = [...new Set(UNIT_DERIVATIONS.map(([, u]) => u))].filter((u) => u !== unit);
    return {
      context: `Welke eenheid hoort bij <b>${expr}</b>?`,
      choices: shuffle([unit, ...shuffle(pool).slice(0, 3)]),
      correct: unit,
      steps: [`Uit ${formula} volgt: ${expr} = ${unit}`]
    };
  }

  const GENERATORS = {
    ohm: genOhm,
    vermogen: genVermogen,
    energie: genEnergie,
    lading: genLading,
    serie: genSerie,
    parallel: genParallel,
    gemengd: genGemengd,
    geleidbaarheid: genGeleidbaarheid,
    soortelijk: genSoortelijk,
    rendement: genRendement,
    transformator: genTransformator,
    eenheden: genEenheden,
    formules: genFormules
  };

  function generateQuestion() {
    const type = state.type === "mix" ? pick(Object.keys(GENERATORS)) : state.type;
    const question = GENERATORS[type](LEVELS.indexOf(state.level));
    return { ...question, type };
  }

  // ---------- Antwoord controleren ----------

  function parseAnswer(raw) {
    let s = raw.trim().replace(/\s+/g, "").replace(/,/g, ".").replace(/−/g, "-");
    s = s.replace(/(?:\*|x|×|·)10\^?/i, "e");
    if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s)) return null;
    return Number(s);
  }

  function isCorrect(given, expected) {
    if (Math.abs(given - expected) <= Math.abs(expected) * REL_TOLERANCE) return true;
    // Afronden op 2 significante cijfers mag ook.
    return Math.abs(given - Number(expected.toPrecision(2))) <= Math.abs(expected) * 1e-9;
  }

  // ---------- Schermen en flow ----------

  function showScreen(name) {
    Object.values(screens).forEach((el) => el.classList.add("hidden"));
    screens[name].classList.remove("hidden");
  }

  function goHome() {
    showScreen("home");
    updateBestScoreDisplay();
  }

  function bestScoreKey() {
    return `stroom-best-${state.type}-${state.level}`;
  }

  function updateBestScoreDisplay() {
    if (!state.type || !state.level) {
      bestScoreEl.textContent = "";
      return;
    }
    const best = localStorage.getItem(bestScoreKey());
    bestScoreEl.textContent = best
      ? `Beste score voor deze oefening: ${best}/${TOTAL_QUESTIONS}`
      : "";
  }

  function maybeSaveBestScore() {
    const key = bestScoreKey();
    const previous = Number(localStorage.getItem(key) || 0);
    if (state.score > previous) {
      localStorage.setItem(key, String(state.score));
    }
  }

  function renderQuestion(q) {
    topicLabel.textContent = TYPE_LABELS[q.type];
    questionContext.innerHTML = q.context || "";
    questionGiven.innerHTML = (q.given || [])
      .map((g) => `<span class="given-item">${g}</span>`)
      .join("");
    questionAsked.innerHTML = q.asked || "";

    diagramEl.innerHTML = q.diagram || "";
    diagramEl.classList.toggle("hidden", !q.diagram);

    const isChoice = Array.isArray(q.choices);
    choicesEl.classList.toggle("hidden", !isChoice);
    answerForm.classList.toggle("hidden", isChoice);
    inputHint.classList.toggle("hidden", isChoice);

    if (isChoice) {
      choicesEl.innerHTML = "";
      q.choices.forEach((choice, index) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "choice-btn";
        btn.innerHTML = choice;
        btn.addEventListener("click", () => handleChoice(index));
        choicesEl.appendChild(btn);
      });
    } else {
      unitLabel.textContent = q.unit;
      answerInput.value = "";
      answerInput.disabled = false;
      answerInput.focus();
    }
  }

  function nextQuestion() {
    if (state.questionIndex >= TOTAL_QUESTIONS) {
      finishRound();
      return;
    }
    state.questionIndex += 1;
    state.answered = false;
    state.current = generateQuestion();
    progressLabel.textContent = `Vraag ${state.questionIndex} van ${TOTAL_QUESTIONS}`;
    scoreLabel.textContent = `Score: ${state.score}`;
    feedbackEl.textContent = "";
    feedbackEl.className = "feedback";
    uitwerkingEl.classList.add("hidden");
    nextBtn.classList.add("hidden");
    renderQuestion(state.current);
  }

  function showOutcome(correct, answerText) {
    state.answered = true;
    if (correct) {
      state.score += 1;
      feedbackEl.innerHTML = `Goed zo! ✅ (${answerText})`;
      feedbackEl.className = "feedback correct";
    } else {
      feedbackEl.innerHTML = `Helaas, het antwoord is ${answerText}. ❌`;
      feedbackEl.className = "feedback incorrect";
    }
    scoreLabel.textContent = `Score: ${state.score}`;

    uitwerkingSteps.innerHTML = state.current.steps.map((s) => `<li>${s}</li>`).join("");
    uitwerkingEl.classList.remove("hidden");

    nextBtn.textContent =
      state.questionIndex >= TOTAL_QUESTIONS ? "Naar resultaat" : "Volgende vraag";
    nextBtn.classList.remove("hidden");
    nextBtn.focus();
  }

  function handleChoice(index) {
    if (state.answered) return;
    const { choices, correct: answer } = state.current;
    const correct = choices[index] === answer;
    choicesEl.querySelectorAll(".choice-btn").forEach((btn, i) => {
      btn.disabled = true;
      if (choices[i] === answer) btn.classList.add("correct");
      else if (i === index) btn.classList.add("incorrect");
    });
    showOutcome(correct, answer);
  }

  function finishRound() {
    maybeSaveBestScore();
    resultText.textContent = `Je hebt ${state.score} van de ${TOTAL_QUESTIONS} goed! ${
      state.score === TOTAL_QUESTIONS ? "Perfect! 🌟" : ""
    }`;
    showScreen("result");
  }

  function startRound() {
    state.questionIndex = 0;
    state.score = 0;
    showScreen("exercise");
    nextQuestion();
  }

  function handleTypeSelect(type) {
    state.type = type;
    typeButtons.forEach((btn) =>
      btn.classList.toggle("selected", btn.dataset.type === type)
    );
    updateStartButton();
    updateBestScoreDisplay();
  }

  function handleLevelSelect(level) {
    state.level = level;
    levelButtons.forEach((btn) =>
      btn.classList.toggle("selected", btn.dataset.level === level)
    );
    updateStartButton();
    updateBestScoreDisplay();
  }

  function updateStartButton() {
    startBtn.disabled = !(state.type && state.level);
  }

  typeButtons.forEach((btn) => {
    btn.addEventListener("click", () => handleTypeSelect(btn.dataset.type));
  });

  levelButtons.forEach((btn) => {
    btn.addEventListener("click", () => handleLevelSelect(btn.dataset.level));
  });

  startBtn.addEventListener("click", startRound);
  retryBtn.addEventListener("click", startRound);

  answerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (state.answered) return;

    const given = parseAnswer(answerInput.value);
    if (given === null) {
      feedbackEl.textContent = "Vul een getal in, bijvoorbeeld 2,5 of 1,6e-19.";
      feedbackEl.className = "feedback incorrect";
      return;
    }

    const { answer, unit } = state.current;
    answerInput.disabled = true;
    showOutcome(isCorrect(given, answer), withUnit(answer, unit));
  });

  nextBtn.addEventListener("click", nextQuestion);

  formulesBtn.addEventListener("click", () => showScreen("formules"));
  formulesQuitBtn.addEventListener("click", goHome);
  homeBtn.addEventListener("click", goHome);
  quitBtn.addEventListener("click", goHome);

  showScreen("home");
})();
