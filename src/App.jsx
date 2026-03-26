import { useState } from "react";
import "./App.css";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer
} from "recharts";

const DRINK_ICONS = {
  beer: "🍺",
  wine: "🍷",
  spirits: "🥃"
};

const DRINKS = {
  beer: [
    { name: "Pivo 10°", abv: 0.04, volumes: [330, 500, 1000] },
    { name: "Pivo 12°", abv: 0.05, volumes: [330, 500, 1000] },
    
  ],
  wine: [
    { name: "Bílé víno", abv: 0.12, volumes: [125, 200, 500] },
    { name: "Červené víno", abv: 0.13, volumes: [125, 200, 500] },
    { name: "Prosecco", abv: 0.11, volumes: [150, 200, 500] }
  ],
  spirits: [
    { name: "Vodka", abv: 0.40, volumes: [30, 40, 50, 100] },
    { name: "Rum", abv: 0.40, volumes: [30, 40, 50, 100] },
    { name: "Slivovice", abv: 0.50, volumes: [30, 40, 50, 100] }
  ]
};

const R = { male: 0.68, female: 0.55 };
const ELIMINATION_PER_HOUR = 0.15; 
const ABSORPTION_DEFICIT = 0.15;    

function App() {
  const [weight, setWeight] = useState("");
  const [gender, setGender] = useState("male");
  const [drinks, setDrinks] = useState([]);
  const [type, setType] = useState("beer");
  const [drinkOption, setDrinkOption] = useState(null);
  const [volume, setVolume] = useState("");
  const [time, setTime] = useState("");
  const [result, setResult] = useState(null);

  function addDrink() {
    if (!volume || !drinkOption || !time) return;
    const newDrink = {
      type,
      name: drinkOption.name,
      volume: Number(volume),
      abv: drinkOption.abv,
      time
    };
    setDrinks([...drinks, newDrink]);
    setVolume("");
    setTime("");
  }

  function removeDrink(index) {
    setDrinks(drinks.filter((_, i) => i !== index));
  }
  function reset() {
    setDrinks([]);       
    setResult(null);     
    setWeight("");       
    setDrinkOption(null); 
  }

  function calculate() {
   const w = parseFloat(weight);

  if (!w || w <= 0) {
    alert("Zadejte platnou váhu (větší než 0 kg).");
    return
    }
    if (drinks.length === 0) {
      alert("Přidejte alespoň jeden drink.");
      return;
    }

    const r = R[gender];
    
    
    const drinkMoments = drinks.map(d => {
      const [h, m] = d.time.split(":");
      const date = new Date();
      date.setHours(parseInt(h), parseInt(m), 0, 0);

      const pureGrams = d.volume * d.abv * 0.789;
      
      const absorbedGrams = pureGrams * (1 - ABSORPTION_DEFICIT);

      return {
        time: date,
        grams: absorbedGrams,
        realGrams: pureGrams
      };
    });

    const start = new Date(Math.min(...drinkMoments.map(d => d.time)));
    let currentPromile = 0;
    let totalRealGrams = 0;
    const graphData = [];

    const STEP_MIN = 10; 
    const STEPS_24H = (24 * 60) / STEP_MIN;

    for (let i = 0; i < STEPS_24H; i++) {
      const currentTime = new Date(start.getTime() + i * STEP_MIN * 60 * 1000);

      drinkMoments.forEach(d => {
        const diffMin = (currentTime - d.time) / (1000 * 60);
        
       
        if (i === 0) totalRealGrams += d.realGrams;

        
        if (Math.abs(diffMin - 30) < STEP_MIN / 2) {
          currentPromile += d.grams / (r * w);
        }
      });

      
      currentPromile = Math.max(currentPromile - (ELIMINATION_PER_HOUR * STEP_MIN) / 60, 0);

     
      if (i % (60 / STEP_MIN) === 0) {
        graphData.push({
          hour: currentTime.getHours().toString().padStart(2, '0') + ":00",
          promile: Number(currentPromile.toFixed(2))
        });
      }
      
     
    }

   
    const soberStepIndex = graphData.findIndex((d, idx) => idx > 0 && d.promile === 0);
    const hoursToSober = soberStepIndex !== -1 ? soberStepIndex : 24;
    const driveTime = new Date(start.getTime() + hoursToSober * 60 * 60 * 1000);

    setResult({
      grams: totalRealGrams,
      maxPromile: Math.max(...graphData.map(d => d.promile)),
      hoursToSober,
      graphData,
      driveTime
    });
  }

  return (
    <div className="container">
      <div className="card">
        <h1>Widmarkova kalkulačka</h1>
        
        <div className="form-group">
        <input 
    type="number" 
    min="0" 
    value={weight} 
    onChange={(e) => {
      const val = e.target.value;
    
      if (val === "" || parseFloat(val) >= 0) {
        setWeight(val);
      }
    }} 
    placeholder="např. 80" 
  />
        </div>

        <div className="form-group">
          <label>Pohlaví</label>
          <select value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="male">Muž</option>
            <option value="female">Žena</option>
          </select>
        </div>

        <h3>Přidat drink</h3>
        <div className="drink-row">
          <select value={type} onChange={(e) => { setType(e.target.value); setDrinkOption(null); setVolume(""); }}>
            <option value="beer">🍺 Pivo</option>
            <option value="wine">🍷 Víno</option>
            <option value="spirits">🥃 Lihoviny</option>
          </select>

          <select value={drinkOption?.name || ""} onChange={(e) => {
            const selected = DRINKS[type].find(d => d.name === e.target.value);
            setDrinkOption(selected);
            setVolume("");
          }}>
            <option value="">Drink</option>
            {DRINKS[type].map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
          </select>

          <select value={volume} onChange={(e) => setVolume(e.target.value)} disabled={!drinkOption}>
            <option value="">Objem</option>
            {drinkOption?.volumes.map(v => <option key={v} value={v}>{v} ml</option>)}
          </select>

          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          <button onClick={addDrink}>➕</button>
        </div>

        <div className="drink-list">
          {drinks.map((d, i) => (
            <div key={i} className="drink-item">
              <span>{DRINK_ICONS[d.type]} {d.name} ({d.volume} ml) - {d.time}</span>
              <button onClick={() => removeDrink(i)}>❌</button>
            </div>
          ))}
        </div>
<div className="button-group" style={{ display: 'flex', gap: '10px' }}>
   <button className="calculate-btn" onClick={calculate}>Vypočítat stav</button>
    
    <button 
      className="calculate-btn" 
      onClick={reset} 
      style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}
    >
      Smazat vše
    </button>
  </div>
        

        {result && (
          <div className="result">
            <div className="stats-grid">
              <div className="stat-box">
                <small>Celkem vypito</small>
                <p>{result.grams.toFixed(1)} g alkoholu</p>
              </div>
              <div className="stat-box">
                <small>Max. hladina</small>
                <p>{result.maxPromile.toFixed(2)} ‰</p>
              </div>
            </div>

            <div className="drive-info">
              <p>Střízlivost cca za: <strong>{result.hoursToSober} h</strong></p>
              <p>Řídit můžete v: <strong>{result.driveTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</strong></p>
            </div>

            {result.maxPromile > 0 && (
              <p className="error" style={{ fontSize: '0.8em', marginTop: '10px' }}>
                ⚠️ V ČR platí nulová tolerance. Výpočet je pouze orientační.
              </p>
            )}

            <div style={{ width: '100%', height: 200, marginTop: '20px' }}>
              <ResponsiveContainer>
                <LineChart data={result.graphData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis dataKey="hour" stroke="#999" fontSize={12} />
                  <YAxis stroke="#999" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: '#333', border: 'none' }} />
                  <Line type="monotone" dataKey="promile" stroke="#646cff" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;