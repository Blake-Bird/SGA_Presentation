# SGA Presentation OS (V2) — everything happens inside presentation

### What this is
A **live presentation deck** where you can:
- Drag events onto a 2‑week calendar while presenting
- Edit event title/cost/notes live (right panel)
- See budget totals update in real time (top bar)
- Show the LaTeX purchase request PDFs **on-screen without clicking** (PDF Wall)

---

## Run on Mac (copy/paste)

### 1) Unzip and enter folder
```bash
cd ~/Downloads
unzip sga-presentation-os-v2.zip
cd sga-event-os-v2
```

### 2) Install dependencies
```bash
npm install
```

### 3) Start the app
```bash
npm run dev
```

### 4) Open
```text
http://localhost:3000
```

---

## Replace PDFs (optional)
Replace files in:
`public/pdfs/`

Keep the same names:
- `CookingComp.pdf`
- `Cooking_Competition.pdf`
- `Fidget.pdf`
- `Infrastructure___Experience_Supplies.pdf`

(If you rename them, update `components/widgets/PdfWall.tsx`.)

---

## Controls
- Use the top nav buttons or ← / → for slides
- Slide 3 = command center (drag/drop + edit live + PDFs visible)
- Everything autosaves in your browser


## PDF fix
This build uses a **local** PDF.js worker copied into `/public/pdf.worker.min.mjs` during `npm install`.
If PDFs ever say “Failed to load”, run:

```bash
npm run postinstall
```
then refresh.
