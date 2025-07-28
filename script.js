// إنشاء الخريطة
const map = L.map('map').setView([28.0, 2.0], 5); // الجزائر

// تحميل الخريطة من OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// متغير لتخزين الإشعاع
let solarIrradiation = null;

// دالة لجلب الإشعاع الشمسي
function getSolarIrradiation(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=solar_radiation_sum&timezone=auto`;

  fetch(url)
    .then(response => response.json())
    .then(data => {
      const irradiation = data.daily?.solar_radiation_sum?.[0];
      if (irradiation) {
        document.getElementById('irradiationValue').innerText = irradiation.toFixed(2) + " kWh/m²/day";
        solarIrradiation = irradiation;
      } else {
        alert("لم يتم العثور على بيانات الإشعاع!");
      }
    })
    .catch(error => {
      console.error("خطأ في جلب بيانات الإشعاع:", error);
      alert("فشل تحميل بيانات الإشعاع الشمسي.");
    });
}

// عند النقر على الخريطة
map.on('click', function (e) {
  const lat = e.latlng.lat.toFixed(4);
  const lon = e.latlng.lng.toFixed(4);

  // تحديث العرض
  document.getElementById('selectedLocation').innerText = `الموقع المحدد: ${lat}, ${lon}`;

  // جلب الإشعاع
  getSolarIrradiation(lat, lon);
});


  // حساب الاستهلاك اليومي حسب نوع الإدخال
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

  // مواصفات الألواح الشمسية
  const panelVoltage = getFloat('panelVoltage') || 18;
  const panelWatt = getFloat('panelWatt') || 300;
  const panelPrice = getFloat('panelPrice') || 150;

  // مواصفات البطارية
  const batteryVoltage = getFloat('batteryVoltage') || 12;
  const batteryCapacity = getFloat('batteryCapacity') || 200;
  const batteryPrice = getFloat('batteryPrice') || 200;

  const systemVoltage = getFloat('systemVoltage') || 24;

  // عدد الألواح المطلوبة
  const energyPerPanel = (panelWatt * solarIrradiation) / 1000;
  const numPanels = Math.ceil(dailyEnergy / energyPerPanel);
  const panelsInSeries = Math.ceil(systemVoltage / panelVoltage);
  const panelsInParallel = Math.ceil(numPanels / panelsInSeries);

  // عدد البطاريات المطلوبة
  const totalBatteryAh = (dailyEnergy * 1000) / (batteryVoltage * 0.5 * 0.9);
  const numBatteries = Math.ceil(totalBatteryAh / batteryCapacity);
  const batteriesInSeries = Math.ceil(systemVoltage / batteryVoltage);
  const batteriesInParallel = Math.ceil(numBatteries / batteriesInSeries);

  // الأسعار الإجمالية
  const totalPanelCost = numPanels * panelPrice;
  const totalBatteryCost = numBatteries * batteryPrice;

  // عرض النتائج
  document.getElementById('results').innerHTML = `
    <h3>النتائج:</h3>
    <p><strong>الطاقة اليومية المطلوبة:</strong> ${dailyEnergy.toFixed(2)} kWh</p>
    <p><strong>عدد الألواح:</strong> ${numPanels} (تسلسل: ${panelsInSeries} × تفرع: ${panelsInParallel})</p>
    <p><strong>عدد البطاريات:</strong> ${numBatteries} (تسلسل: ${batteriesInSeries} × تفرع: ${batteriesInParallel})</p>
    <p><strong>تكلفة الألواح:</strong> ${totalPanelCost} دج</p>
    <p><strong>تكلفة البطاريات:</strong> ${totalBatteryCost} دج</p>
    <p><strong>إجمالي الإشعاع الشمسي:</strong> ${solarIrradiation.toFixed(2)} kWh/m²/day</p>
  `;


// خريطة Leaflet لتحديد الموقع
function initMap() {
  const map = L.map('map').setView([28, 2], 5);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data © OpenStreetMap contributors',
  }).addTo(map);

  let marker;

  map.on('click', function (e) {
    const { lat, lng } = e.latlng;
    if (marker) marker.remove();
    marker = L.marker([lat, lng]).addTo(map);
    fetchIrradiation(lat, lng);
  });
}

// جلب بيانات الإشعاع من PVGIS API
async function fetchIrradiation(lat, lon) {
  const url = `https://re.jrc.ec.europa.eu/api/v5_2/PVcalc?lat=${lat}&lon=${lon}&peakpower=1&loss=14&angle=30&aspect=0&outputformat=json`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    const irradiation = data.outputs.totals.fixed.ED; // kWh/m²/day
    solarIrradiation = irradiation;
    document.getElementById('irradiance').innerText = irradiation.toFixed(2);
  } catch (error) {
    alert('⚠️ حدث خطأ أثناء جلب بيانات الإشعاع الشمسي');
    console.error(error);
  }
}

// يجب استدعاء initMap() عند تحميل الصفحة
window.onload = initMap;
