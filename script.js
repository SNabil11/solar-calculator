let solarIrradiation = null;

function getFloat(id) {
  return parseFloat(document.getElementById(id)?.value) || 0;
}

window.onload = function () {
  // إنشاء الخريطة
const map = L.map('map').setView([28.0, 2.0], 5);

// تحميل خريطة OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// متغير عام لتخزين قيمة الإشعاع
let solarIrradiation = null;

// جلب بيانات الإشعاع من PVGIS
async function getSolarIrradiationFromPVGIS(lat, lon) {
    const url = `https://re.jrc.ec.europa.eu/api/v5_2/seriescalc?lat=${lat}&lon=${lon}&startyear=2020&endyear=2020&pvtechchoice=crystSi&peakpower=1&loss=14&outputformat=json`;
  
    try {
      const response = await fetch(url);
      const data = await response.json();
  
      // المحاولة أولاً مع البيانات اليومية
      if (data.outputs?.daily_profile?.length > 0) {
        let total = 0;
        let count = 0;
        data.outputs.daily_profile.forEach(day => {
          if (typeof day.PEpv === 'number') {
            total += day.PEpv;
            count++;
          }
        });
        if (count > 0) {
          solarIrradiation = total / count;
          document.getElementById('irradiationValue').innerText = solarIrradiation.toFixed(2) + " kWh/m²/day (يومي)";
          return;
        }
      }
  
      // إن لم توجد يومية، نلجأ إلى الشهرية
      if (data.outputs?.monthly?.length > 0) {
        let totalMonthly = 0;
        data.outputs.monthly.forEach(month => {
          if (typeof month.E_d === 'number') {
            totalMonthly += month.E_d;
          }
        });
        solarIrradiation = totalMonthly / data.outputs.monthly.length;
        document.getElementById('irradiationValue').innerText = solarIrradiation.toFixed(2) + " kWh/m²/day (شهري)";
        return;
      }
  
      alert("⚠️ لم يتم العثور على بيانات الإشعاع الشمسي.");
    } catch (error) {
      console.error("❌ خطأ في الاتصال بـ PVGIS:", error);
      alert("❌ حدث خطأ أثناء جلب بيانات الإشعاع الشمسي.");
    }
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
