// Inisialisasi WebSocket
const socket = io("https://flask-api-791509754603.us-central1.run.app"); // Sesuaikan dengan URL WebSocket server Anda

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

let sensorChart = null;

// Socket.IO Event Handlers
socket.on("connect", () => {
  console.log("Connected to server");
  // Request initial data
  socket.emit("request_sensor_data");
});

socket.on("connection_response", (response) => {
  console.log("Connection response:", response);
});

socket.on("sensor_data", (response) => {
  if (response.status === "success") {
    updateDashboard(response.data);
  } else {
    console.error("Error:", response.message);
  }
});

socket.on("sensor_data_stream", (response) => {
  if (response.status === "success") {
    updateDashboard(response.data);
  } else {
    console.error("Stream error:", response.message);
  }
});

socket.on("disconnect", () => {
  console.log("Disconnected from server");
});

// Update Dashboard Function
function updateDashboard(sensorData) {
  if (sensorData.length === 0) return;

  const latestData = sensorData[sensorData.length - 1];

  // Update cards
  $("#current-temp").text(latestData.suhu + "°C");
  $("#current-humidity").text(latestData.kelembapan + "%");
  $("#current-ammonia").text(latestData.amonia + " PPM");

  // Update chart data
  chartData.labels = sensorData.map((item) => dayjs(item.timestamp).format("DD-MM-YYYY HH:mm:ss"));
  chartData.datasets[0].data = sensorData.map((item) => item.suhu);
  chartData.datasets[1].data = sensorData.map((item) => item.kelembapan);
  chartData.datasets[2].data = sensorData.map((item) => item.amonia);

  renderChart();
}

// Chart rendering function
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
            pan: {
              enabled: true,
              mode: "xy",
            },
            zoom: {
              wheel: { enabled: true },
              pinch: { enabled: true },
              mode: "xy",
            },
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: "Timestamp",
            },
          },
          y: {
            title: {
              display: true,
              text: "Nilai Sensor",
            },
            beginAtZero: true,
          },
        },
      },
    });
  } else {
    sensorChart.update();
  }
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

// Reconnection logic
socket.on("connect_error", (error) => {
  console.log("Connection Error:", error);
  setTimeout(() => {
    socket.connect();
  }, 5000);
});
