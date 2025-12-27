
const apiKey = 'c5d73f4d32dd502acd03ead83b9d0130';
const url = `http://api.aviationstack.com/v1/flights?access_key=${apiKey}&arr_iata=SVQ&limit=10`;

console.log(`Testing URL: ${url}`);

try {
    const response = await fetch(url);
    if (!response.ok) {
        console.error(`HTTP Error: ${response.status} ${response.statusText}`);
    } else {
        const json = await response.json();
        if (json.error) {
            console.error('API Error:', json.error);
        } else if (json.data) {
            console.log(`Success! Found ${json.data.length} flights.`);
            if (json.data.length > 0) {
                console.log('First flight sample:', JSON.stringify(json.data[0], null, 2));
            } else {
                console.log('Data array is empty.');
            }
        } else {
            console.log('Unexpected response structure:', JSON.stringify(json, null, 2));
        }
    }
} catch (error) {
    console.error('Fetch Error:', error);
}
