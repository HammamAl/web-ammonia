const socket = io("https://flask-api-791509754603.us-central1.run.app"); // Sesuaikan dengan URL WebSocket server Anda
const REFRESH_RATE = 5000; // Refresh setiap 5 detik
const ABSOLUTE_MAX_DATA = 5000;
const dataCache = new Map();
let MAX_DATA_POINTS = 100;
let currentSensorData = []; // Untuk menyimpan semua data sensor
let updateTimeout;
let refreshInterval;

const chartData = {
  labels: [],
  datasets: [
    {
      label: "Suhu (°C)",
      data: [],
      borderColor: "rgba(255, 99, 132, 1)",
      backgroundColor: "rgba(255, 99, 132, 0.2)",
      fill: false,
    },
    {
      label: "Kelembapan (%)",
      data: [],
      borderColor: "rgba(54, 162, 235, 1)",
      backgroundColor: "rgba(54, 162, 235, 0.2)",
      fill: false,
    },
    {
      label: "Amonia (PPM)",
      data: [],
      borderColor: "rgba(255, 206, 86, 1)",
      backgroundColor: "rgba(255, 206, 86, 0.2)",
      fill: false,
    },
  ],
};

const chartOptions = {
  animation: false,
  responsiveAnimationDuration: 0,
  elements: {
    line: {
      tension: 0, // Matikan kurva smooth
    },
  },
  spanGaps: true,
  decimation: {
    enabled: true,
    algorithm: "min-max",
  },
};

let sensorChart = null;

// Socket.IO Event Handlers
socket.on("connect", () => {
  console.log("Connected to server");
  // Request initial data
  socket.emit("request_sensor_data");
  startAutoRefresh(); // Mulai auto refresh saat terkoneksi
});

socket.on("connection_response", (response) => {
  console.log("Connection response:", response);
});

socket.on("sensor_data", (response) => {
  if (response.status === "success") {
    currentSensorData = response.data; // Simpan semua data
    updateDashboard();
  } else {
    console.error("Error:", response.message);
  }
});

socket.on("sensor_data_stream", (response) => {
  if (response.status === "success") {
    currentSensorData = response.data; // Simpan semua data
    updateDashboard();
  } else {
    console.error("Stream error:", response.message);
  }
});

socket.on("disconnect", () => {
  console.log("Disconnected from server");
  stopAutoRefresh(); // Hentikan auto refresh saat terputus
});

// Tambahkan error handling
socket.on("error", (error) => {
  console.error("Socket error:", error);
  stopAutoRefresh();
});

// Fungsi untuk memulai auto refresh
function startAutoRefresh() {
  // Clear interval yang ada (jika ada)
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }

  // Set interval baru
  refreshInterval = setInterval(() => {
    socket.emit("request_sensor_data");
  }, REFRESH_RATE);
}

// Fungsi untuk menghentikan auto refresh
function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
}

// memory management
function manageDataStorage(newData) {
  currentSensorData = [...currentSensorData, ...newData];
  if (currentSensorData.length > ABSOLUTE_MAX_DATA) {
    currentSensorData = currentSensorData.slice(-ABSOLUTE_MAX_DATA);
  }
}

// error handling dan loading state
function updateDashboard() {
  try {
    document.getElementById("chartContainer").classList.add("loading");
    // ... kode update existing ...
  } catch (error) {
    console.error("Update error:", error);
    showErrorMessage("Gagal memperbarui data");
  } finally {
    document.getElementById("chartContainer").classList.remove("loading");
  }
}

// fungsi throttle
function throttle(func, limit) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Tambah data caching
function getCachedData(dataPoints) {
  const cacheKey = `data_${dataPoints}`;
  if (!dataCache.has(cacheKey)) {
    const limitedData = currentSensorData.slice(-dataPoints);
    dataCache.set(cacheKey, limitedData);
  }
  return dataCache.get(cacheKey);
}

function debouncedUpdate() {
  clearTimeout(updateTimeout);
  updateTimeout = setTimeout(() => {
    updateDashboard();
  }, 250); // Tunggu 250ms setelah slider berhenti
}

// Clear cache saat data baru
function clearCache() {
  dataCache.clear();
}

// fungsi updateDashboard
function updateDashboard() {
  if (currentSensorData.length === 0) return;

  // Update nilai terkini dulu
  const latestData = currentSensorData[currentSensorData.length - 1];
  updateCurrentValues(latestData);

  // Update grafik dengan requestAnimationFrame
  requestAnimationFrame(() => {
    const limitedData = currentSensorData.slice(-MAX_DATA_POINTS);
    updateChart(limitedData);
  });
}

function updateCurrentValues(data) {
  $("#current-temp").text(data.suhu + "°C");
  $("#current-humidity").text(data.kelembapan + "%");
  $("#current-ammonia").text(data.amonia + " PPM");
}

function updateChart(data) {
  chartData.labels = data.map((item) => dayjs(item.timestamp).format("DD-MM-YYYY HH:mm:ss"));
  chartData.datasets[0].data = data.map((item) => item.suhu);
  chartData.datasets[1].data = data.map((item) => item.kelembapan);
  chartData.datasets[2].data = data.map((item) => item.amonia);

  renderChart();
}

// Chart rendering function dengan optimasi
function renderChart() {
  const ctx = document.getElementById("sensorChart").getContext("2d");

  if (!sensorChart) {
    sensorChart = new Chart(ctx, {
      type: "line",
      data: chartData,
      options: {
        responsive: true,
        plugins: {
          zoom: {
            pan: { enabled: true, mode: "xy" },
            zoom: {
              wheel: { enabled: true },
              pinch: { enabled: true },
              mode: "xy",
            },
          },
          tooltip: {
            mode: "index",
            intersect: false,
          },
        },
        scales: {
          x: {
            title: { display: true, text: "Timestamp" },
            ticks: { maxTicksLimit: 15 }, // Batasi jumlah label di sumbu X
          },
          y: {
            title: { display: true, text: "Nilai Sensor" },
            beginAtZero: true,
          },
        },
        animation: {
          duration: 0, // Matikan animasi untuk performa lebih baik
        },
      },
    });
  } else {
    sensorChart.update("none"); // Update tanpa animasi
  }
}

// Inisialisasi chart dengan optimasi
function initChart() {
  const ctx = document.getElementById("sensorChart").getContext("2d");
  chart = new Chart(ctx, {
    type: "line",
    data: chartData,
    options: chartOptions,
  });
}

// Zoom control handlers
document.getElementById("zoomIn").addEventListener("click", () => {
  sensorChart.zoom(1.1);
});

document.getElementById("zoomOut").addEventListener("click", () => {
  sensorChart.zoom(0.9);
});

document.getElementById("resetZoom").addEventListener("click", () => {
  sensorChart.resetZoom();
});

document.getElementById("dataSlider").addEventListener(
  "input",
  throttle(function (e) {
    MAX_DATA_POINTS = parseInt(e.target.value);
    document.getElementById("sliderValue").textContent = MAX_DATA_POINTS;
    updateDashboard();
  }, 200)
);

// Reconnection logic
socket.on("connect_error", (error) => {
  console.log("Connection Error:", error);
  setTimeout(() => {
    socket.connect();
  }, 5000);
});
