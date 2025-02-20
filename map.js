// Set your Mapbox access token here
mapboxgl.accessToken = 'pk.eyJ1IjoicmVlbWFzMDMiLCJhIjoiY203ZGtjYTIwMDN5ejJtcTN0YXB0d2dqNiJ9.jE6KY57HvSYGqgyvxQeGPQ';

// Initialize the map
const map = new mapboxgl.Map({
    container: 'map', // ID of the div where the map will render
    style: 'mapbox://styles/mapbox/streets-v12', // Map style
    center: [-71.09415, 42.36027], // [longitude, latitude]
    zoom: 12, // Initial zoom level
    minZoom: 5, // Minimum allowed zoom
    maxZoom: 18 // Maximum allowed zoom
});

map.on('load', () => { 
    //code 
    const bikeLaneStyle = {
        'line-color': '#32D400',
        'line-width': 5,
        'line-opacity': 0.6
    };

    map.addSource('boston_route', {
        type: 'geojson',
        data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson'
    });

    map.addLayer({
        id: 'bike-lanes',
        type: 'line',
        source: 'boston_route',
        paint: bikeLaneStyle
    });

    map.addSource('cambridge_route', {
        type: 'geojson',
        data: 'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson'
    });

    map.addLayer({
        id: 'bike-lanes-c',
        type: 'line',
        source: 'cambridge_route',
        paint: bikeLaneStyle
    });

    // Load the nested JSON file
    const jsonurl = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json'
    const trips = 'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv';

    Promise.all([d3.json(jsonurl), d3.csv(trips)]).then(([jsonData, tripsData]) => {
        console.log('Loaded JSON Data:', jsonData);  // Log to verify structure
        let stations = jsonData.data.stations;
        console.log('Stations Array:', stations);

        let departures = d3.rollup(
            tripsData,
            (v) => v.length,
            (d) => d.start_station_id,
        );

        let arrivals = d3.rollup(
            tripsData,
            (v) => v.length,
            (d) => d.end_station_id,
        );

        stations = stations.map((station) => {
            let id = station.short_name;
            console.log(id);

            station.arrivals = arrivals.get(id) ?? 0;
            // TODO departures
            station.departures = departures.get(id) ?? 0;
            // TODO totalTraffic
            station.totalTraffic = station.arrivals + station.departures;
            
            return station;
        });

        const radiusScale = d3
            .scaleSqrt()
            .domain([0, d3.max(stations, (d) => d.totalTraffic)])
            .range([0, 25]);

        const svg = d3.select('#map').select('svg');

        function getCoords(station) {
            const point = new mapboxgl.LngLat(+station.lon, +station.lat);  // Convert lon/lat to Mapbox LngLat
            const { x, y } = map.project(point);  // Project to pixel coordinates
            return { cx: x, cy: y };  // Return as object for use in SVG attributes
        }

        // Append circles to the SVG for each station
        const circles = svg.selectAll('circle')
        .data(stations)
        .enter()
        .append('circle')
        .attr('r', d => radiusScale(d.totalTraffic))   // Radius of the circle
        .attr('fill', 'steelblue')  // Circle fill color
        .attr('stroke', 'white')    // Circle border color
        .attr('stroke-width', 1)    // Circle border thickness
        .attr('opacity', 0.8)      // Circle opacity
        .each(function(d) { 
            d3.select(this)
                .append('title') // Tooltip
                .text(`${d.totalTraffic} tripsData (${d.departures} departures, ${d.arrivals} arrivals)`);
        });

        // Function to update circle positions when the map moves/zooms
        function updatePositions() {
            circles
                .attr('cx', d => getCoords(d).cx)  // Set the x-position using projected coordinates
                .attr('cy', d => getCoords(d).cy); // Set the y-position using projected coordinates
        }

        // Initial position update when map loads
        updatePositions();


        // Reposition markers on map interactions
        map.on('move', updatePositions);     // Update during map movement
        map.on('zoom', updatePositions);     // Update during zooming
        map.on('resize', updatePositions);   // Update on window resize
        map.on('moveend', updatePositions);  // Final adjustment after movement ends
        
    }).catch(error => {
      console.error('Error loading JSON:', error);  // Handle errors if JSON loading fails
    });
});
