let solarIrradiation = null;

function getFloat(id) {
  return parseFloat(document.getElementById(id)?.value) || 0;
}

window.onload = function () {
  const map = L.map('map').setView([28.0, 2.0], 5);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  let marker = null;

  map.on('click', function (e) {
    const lat = e.latlng.lat.toFixed(4);
    const lon = e.latlng.lng.toFixed(4);

    if (marker) marker.remove();
    marker = L.marker([lat, lon]).addTo(map);

    document.getElementById('selectedLocation').innerText = `📍 الموقع: ${lat}, ${lon}`;

    // جلب الإشعاع من Open-Meteo
    fetchIrradiation_OpenMeteo(lat, lon);
  });
};

async function fetchIrradiation_OpenMeteo(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=shortwave_radiation_sum&timezone=auto`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    const values = data.daily.shortwave_radiation_sum;

    if (values && values.length > 0) {
      // نحسب المتوسط من 7 أيام القادمة
      const avg = values.slice(0, 7).reduce((a, b) => a + b, 0) / 7;
      solarIrradiation = avg;
      document.getElementById('irradiationValue').innerText = `${avg.toFixed(2)} kWh/m²/day`;
    } else {
      throw new Error("لا توجد بيانات إشعاع متاحة.");
    }
  } catch (err) {
    alert("❌ تعذر تحميل بيانات الإشعاع من Open-Meteo.");
    console.error(err);
  }
}

function calculate() {
  let dailyEnergy = 0;
  const mode = document.querySelector('input[name="inputMode"]:checked')?.value;

  if (mode === 'direct') {
    let daily = getFloat('dailyUsage');
    const monthly = getFloat('monthlyUsage');
    if (!daily && monthly) {
      daily = monthly / 30;
    }
    dailyEnergy = daily;
  } else {
    const table = document.getElementById('devicesTable');
    for (let i = 1; i < table.rows.length; i++) {
      const power = parseFloat(table.rows[i].cells[1].children[0].value) || 0;
      const hours = parseFloat(table.rows[i].cells[2].children[0].value) || 0;
      const qty = parseInt(table.rows[i].cells[3].children[0].value) || 0;
      dailyEnergy += (power * hours * qty) / 1000;
    }
  }

  if (!solarIrradiation) {
    alert("الرجاء اختيار الموقع من الخريطة لجلب بيانات الإشعاع الشمسي!");
    return;
  }

  const panelVoltage = getFloat('panelVoltage') || 18;
  const panelWatt = getFloat('panelWatt') || 300;
  const panelPrice = getFloat('panelPrice') || 150;

  const batteryVoltage = getFloat('batteryVoltage') || 12;
  const batteryCapacity = getFloat('batteryCapacity') || 200;
  const batteryPrice = getFloat('batteryPrice') || 200;

  const systemVoltage = getFloat('systemVoltage') || 24;

  const energyPerPanel = (panelWatt * solarIrradiation) / 1000;
  const numPanels = Math.ceil(dailyEnergy / energyPerPanel);
  const panelsInSeries = Math.ceil(systemVoltage / panelVoltage);
  const panelsInParallel = Math.ceil(numPanels / panelsInSeries);

  const totalBatteryAh = (dailyEnergy * 1000) / (batteryVoltage * 0.5 * 0.9);
  const numBatteries = Math.ceil(totalBatteryAh / batteryCapacity);
  const batteriesInSeries = Math.ceil(systemVoltage / batteryVoltage);
  const batteriesInParallel = Math.ceil(numBatteries / batteriesInSeries);

  const totalPanelCost = numPanels * panelPrice;
  const totalBatteryCost = numBatteries * batteryPrice;

  document.getElementById('results').innerHTML = `
    <h3>🔍 النتائج:</h3>
    <p><strong>📊 الطاقة اليومية المطلوبة:</strong> ${dailyEnergy.toFixed(2)} kWh</p>
    <p><strong>☀️ الإشعاع الشمسي:</strong> ${solarIrradiation.toFixed(2)} kWh/m²/day</p>
    <p><strong>🔌 عدد الألواح:</strong> ${numPanels} (سلسلة: ${panelsInSeries}, تفرع: ${panelsInParallel})</p>
    <p><strong>🔋 عدد البطاريات:</strong> ${numBatteries} (سلسلة: ${batteriesInSeries}, تفرع: ${batteriesInParallel})</p>
    <p><strong>💰 تكلفة الألواح:</strong> ${totalPanelCost} DA</p>
    <p><strong>💰 تكلفة البطاريات:</strong> ${totalBatteryCost} DA</p>
  `;
}
