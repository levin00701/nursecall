
// Địa chỉ và cấu hình của broker MQTT
// var brokerUrl = "mqtt://ec2-34-207-225-173.compute-1.amazonaws.com:1883";
var brokerUrl = "ws://ec2-54-81-207-151.compute-1.amazonaws.com:9001/mqtt";
var clientId = "web-client-" + new Date().getTime();  // Tạo clientId ngẫu nhiên
var temperatureTopic = "temperature";  // Chủ đề bạn muốn subscribe
var nurseTopic = "nurse";
var lightTopic = "lightStatus";
var connectionStatusElement = document.getElementById("connection-status");

// Tạo một đối tượng client MQTT thông qua WebSocket
var client = new Paho.MQTT.Client(brokerUrl, clientId);

// Đăng ký callback khi kết nối thành công
client.onConnectionLost = onConnectionLost;
client.onMessageArrived = onMessageArrived;

// Kết nối đến broker MQTT
client.connect({ onSuccess: onConnect });

// Callback khi kết nối thành công
function onConnect() {
    console.log("Connected to MQTT broker");
    client.subscribe(temperatureTopic, { qos: 1 });  // Subscribe đến chủ đề
    client.subscribe(nurseTopic, { qos: 1 });
    client.subscribe(lightTopic, { qos: 1 });
    connectionStatusElement.textContent = "Connected";
    connectionStatusElement.style.color = "green";

}

// Callback khi mất kết nối
function onConnectionLost(responseObject) {
    if (responseObject.errorCode !== 0) {
        console.log("Connection lost: " + responseObject.errorMessage);
        connectionStatusElement.textContent = "Disconnected";
        connectionStatusElement.style.color = "red";
    }
}

var data = [
    {
        domain: { x: [0, 1], y: [0, 1] },
        value: 20, // Initial temperature value
        title: { text: "Temperature" },
        type: "indicator",
        mode: "gauge+number",
        gauge: {
            axis: { range: [0, 100] }, // Set the range for your gauge from 0 to 100
            bar: { color: "black" },
            steps: [
                { range: [0, 40], color: "green" },
                { range: [40, 100], color: "red" },
            ],
        }
    }
];

var layout = { width: 400, height: 400, margin: { t: 0, b: 0 } };
Plotly.newPlot('gaugeDiv', data, layout);


// Initialize the line chart with empty data
var temperatureData = {
    x: [],
    y: [],
    type: 'scatter',
    mode: 'lines',
    name: 'Temperature'
};

var temperatureLayout = {
    title: 'Temperature Data',
    xaxis: {
        title: 'Time'
    },
    yaxis: {
        title: 'Temperature'
    },
    width: 600, // Set the width of the line chart
    height: 300, // Set the height of the line chart
    margin: { t: 30, b: 30, l: 50, r: 10 } // Adjust margins as needed
};

Plotly.newPlot('lineDiv', [temperatureData], temperatureLayout);


// Callback khi nhận được thông điệp từ broker
function onMessageArrived(message) {
    try {
        var jsonData = JSON.parse(message.payloadString);

        // Check the topic of the received message
        var topic = message.destinationName;

        if (topic === temperatureTopic) {
            // Handle temperature data
            var temperature = jsonData.temperature;
            var temperatureContainer = document.getElementById("temperature-container");
            temperatureContainer.innerHTML = 'Temperature: ' + temperature;

            // Update the gauge chart with the new temperature value
            Plotly.update('gaugeDiv', { "value": temperature });

            // Update the line chart with the new temperature data
            var currentTime = new Date();
            temperatureData.x.push(currentTime);
            temperatureData.y.push(temperature);
            Plotly.update('lineDiv', [temperatureData], temperatureLayout);
        } else if (topic === nurseTopic) {
            // Handle nurse messages
            var nurseMessage = jsonData.nurseMessage;
            var imagePatient = document.getElementById("imagePatient");
            var audioPlayer = document.getElementById("audioPlayer");
            var audioSource = document.getElementById("audioSource");

            if (nurseMessage === "NORMAL") {
                // Set the image source to the default image
                imagePatient.src = "normal.PNG";

                audioSource.src = "Normal.mp3";
                audioPlayer.load();
                audioPlayer.play();

            } else if (nurseMessage === "EMERGENCY") {
                // Set the image source to the emergency image
                imagePatient.src = "emergency.PNG";

                audioSource.src = "Emergency.mp3";
                audioPlayer.load();
                audioPlayer.play();
            } else if (nurseMessage === "CONFIRM") {
                // Set the image source to the confirm image
                imagePatient.src = "confirm.PNG";

                audioPlayer.pause();
            }
        } else if (topic === lightTopic) {
            // Handle nurse messages
            var lightStatusMessage = jsonData.lightStatus;
            var imageLight = document.getElementById("imageLight");

            if (lightStatusMessage === "True") {

                imageLight.src = "lightOn.PNG";
            } else if (lightStatusMessage === "False") {

                imageLight.src = "lightOff.PNG";
            }
        }
    } catch (error) {
        console.error('Error parsing JSON:', error);
    }
}

function turnOnOffLight(status) {

    try {
        const jsonObject = { "light": status };
        var message = new Paho.MQTT.Message(JSON.stringify(jsonObject));
        message.destinationName = 'lightControl'; // Replace with your MQTT topic
        message.qos = 1; // Set QoS level to 1 (At least once)

        client.send(message);
        console.log('Published JSON message:', jsonObject);

        // Clear the input field
    } catch (error) {
        console.error('Error parsing JSON:', error);
    }
}
