import { useState, useEffect } from 'react';
import axios from 'axios';
import Dexie from 'dexie';
import Chart from 'chart.js/auto';

//define WeatherData item
interface WeatherData {
  latitude: number;
  longitude: number;
  hourly: {
    time: string[];
    relativehumidity_2m: number[];
    direct_radiation: number[];
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
}

// Create a new database instance
const db = new Dexie('WeatherDatabase');
db.version(1).stores({
  weather: '++id, latitude, longitude, hourly_time, hourly_relativehumidity_2m, hourly_direct_radiation, daily_time, daily_temperature_2m_max, daily_temperature_2m_min',
});

function Content(): JSX.Element {

  //define constant 
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);

  //fetch data from API and insert into database
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await axios.get(
          'https://api.open-meteo.com/v1/forecast?latitude=1.29&longitude=103.85&hourly=relativehumidity_2m,direct_radiation&daily=temperature_2m_max,temperature_2m_min&timezone=Asia%2FSingapore&start_date=2023-10-01&end_date=2023-10-10'
        );
        setWeatherData(response.data);
        await insertData(response.data); //store in database
      } catch (error) {
        console.error('Error fetching data: ', error);
        // If fetching fails, try to retrieve data from database
        const dataFromDB = await getDataFromDB();
        if (dataFromDB) {
          setWeatherData(dataFromDB);
        }
      }
    }
    fetchData();
  }, []);

  //insert function
  const insertData = async (data: WeatherData) => {
    try {
      await db.table('weather').put(data);
    } catch (error) {
      console.error('Error inserting data: ', error);
    }
  };

  //retrieve data function
  const getDataFromDB = async (): Promise<WeatherData | null> => {
    try {
      const storedData = await db.table('weather').toArray();
      if (storedData && storedData.length > 0) {
        return storedData[storedData.length - 1];// Retrieve the latest stored data
      }
    } catch (error) {
      console.error('Error retrieving data from IndexedDB: ', error);
    }
    return null;
  };
  

  //create charts for data
  useEffect(() => {
    if (weatherData) {
      createCharts(weatherData);
    }
  }, [weatherData]);

  const createCharts = (data: WeatherData) => {
    const humidityChartCanvas = document.getElementById(
      'humidityChart'
    ) as HTMLCanvasElement;
    const temperatureChartCanvas = document.getElementById(
      'temperatureChart'
    ) as HTMLCanvasElement;
    const radiationChartCanvas = document.getElementById(
      'radiationChart'
    ) as HTMLCanvasElement;

    // Create column chart for relative humidity
    new Chart(humidityChartCanvas, {
      type: 'bar',
      data: {
        labels: data.hourly.time,
        datasets: [
          {
            label: 'Relative Humidity (%)',
            data: data.hourly.relativehumidity_2m,
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
          },
        ],
      },
      options: {
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    });

    // Create line chart for temperature min and max
    new Chart(temperatureChartCanvas, {
      type: 'line',
      data: {
        labels: data.daily.time,
        datasets: [
          {
            label: 'Max Temperature (°C)',
            data: data.daily.temperature_2m_max,
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 2,
            fill: false,
          },
          {
            label: 'Min Temperature (°C)',
            data: data.daily.temperature_2m_min,
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 2,
            fill: false,
          },
        ],
      },
      options: {
        scales: {
          y: {
            beginAtZero: false,
          },
        },
      },
    });

    // Create area chart for direct radiation
    new Chart(radiationChartCanvas, {
      type: 'line',
      data: {
        labels: data.hourly.time,
        datasets: [
          {
            label: 'Direct Radiation (W/m²)',
            data: data.hourly.direct_radiation,
            backgroundColor: 'rgba(255, 206, 86, 0.5)', // Adjust the opacity for the area chart
            borderColor: 'rgba(255, 206, 86, 1)',
            borderWidth: 1,
            fill: true, // Specify to fill the area under the line
          },
        ],
      },
      options: {
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    });
  };

  //return the charts
  return (
    <div>
      <div className="chart-container">
        <canvas id="humidityChart" width="400" height="300"></canvas>
      </div>
      <div className="chart-container">
        <canvas id="temperatureChart" width="400" height="300"></canvas>
      </div>
      <div className="chart-container">
        <canvas id="radiationChart" width="400" height="300"></canvas>
      </div>
    </div>
  );
}

export default Content;
