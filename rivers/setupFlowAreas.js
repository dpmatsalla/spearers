//Here, setupFlowAreas needs to be redesigned based on the LatLngs for the quad corners.  So don't use the function latLngToContainerPoint.

// Function to setup the ctxAreas canvas based on the riverPoints from setup
function setupFlowAreas() {
	ctxAreas = [];
	// update ctxAreas for all quadrangles
	riverPoints.forEach(function(point, index) {
		// if dnstreamPt1 is not -1, then calculate the quad corners
		if (point.p1 >= 0) {
			const p1 = riverPoints[point.p1];
			var dirdist = calculateDistanceAndBearing(point.latlng, p1.latlng);
			var ctxArea = {
				vertices: [computeDestinationPoint(point.latlng, point.w, dirdist.bearing-90),
					computeDestinationPoint(point.latlng, point.w, dirdist.bearing+90),
					computeDestinationPoint(p1.latlng, p1.w, dirdist.bearing+90), 
					computeDestinationPoint(p1.latlng, p1.w, dirdist.bearing-90)], 
				dir: dirdist.bearing,
				v: point.v,
				stn: point.stn 
			}
			ctxAreas.push(ctxArea);
		}
			
		//if there's a second dnstreamPt2, then calculate another quad
		if (point.p2 >= 0) {
			const p2 = riverPoints[point.p2];
			var dirdist2 = calculateDistanceAndBearing(point.latlng, p2.latlng);
			var ctxArea2 = {
				vertices: [computeDestinationPoint(point.latlng, point.w, dirdist2.bearing-90),
					computeDestinationPoint(point.latlng, point.w, dirdist2.bearing+90),
					computeDestinationPoint(p2.latlng, p2.w, dirdist2.bearing+90), 
					computeDestinationPoint(p2.latlng, p2.w, dirdist2.bearing-90)], 
				dir: dirdist2.bearing,
				v: point.v,
				stn: point.stn
			}
			ctxAreas.push(ctxArea2);
		}
	});
}

function calculateDistanceAndBearing(latlng1, latlng2) {
	// Convert degrees to radians
	var lat1 = latlng1.lat;
	var lng1 = latlng1.lng;
	var lat2 = latlng2.lat;
	var lng2 = latlng2.lng;
	var lat1Rad = lat1 * (Math.PI / 180);
	var lng1Rad = lng1 * (Math.PI / 180);
	var lat2Rad = lat2 * (Math.PI / 180);
	var lng2Rad = lng2 * (Math.PI / 180);

	// Earth's radius in meters
	var R = 6371000;

	// Calculate differences in longitude and latitude
	var dLon = lng2Rad - lng1Rad;
	var dLat = lat2Rad - lat1Rad;

	// Calculate distance using Haversine formula
	var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
			Math.cos(lat1Rad) * Math.cos(lat2Rad) *
			Math.sin(dLon / 2) * Math.sin(dLon / 2);
	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	var distance = R * c; // Distance in meters

	// Calculate bearing using atan2
	var y = Math.sin(dLon) * Math.cos(lat2Rad);
	var x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
			Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
	var bearing = Math.atan2(y, x); // Bearing in radians

	// Convert bearing from radians to degrees (0 to 360 degrees)
	var bearingDegrees = (bearing * (180 / Math.PI) + 360) % 360;

	return {
		distance: distance, // Distance in meters
		bearing: bearingDegrees // Bearing in degrees (0 to 360 degrees)
	};
}

function computeDestinationPoint(latlng, distance, bearing) {
	// Convert degrees to radians
	var lat1 = latlng.lat;
	var lng1 = latlng.lng;
	var lat1Rad = lat1 * (Math.PI / 180);
	var lng1Rad = lng1 * (Math.PI / 180);
	var bearingRad = bearing * (Math.PI / 180);
	var R = 6371000; // Earth's radius in meters

	// Calculate new latitude
	var lat2Rad = Math.asin(Math.sin(lat1Rad) * Math.cos(distance / R) +
		Math.cos(lat1Rad) * Math.sin(distance / R) * Math.cos(bearingRad));

	// Calculate new longitude
	var lng2Rad = lng1Rad + Math.atan2(Math.sin(bearingRad) * Math.sin(distance / R) * Math.cos(lat1Rad),
		Math.cos(distance / R) - Math.sin(lat1Rad) * Math.sin(lat2Rad));

	// Convert radians back to degrees for latitude and longitude
	var lat2 = lat2Rad * (180 / Math.PI);
	var lng2 = lng2Rad * (180 / Math.PI);

	return { lat: lat2, lng: lng2 };
}

function alignCanvas() {
	// Calculate canvas position relative to the mapContainer
	var mapContainerRect = mapContainer.getBoundingClientRect();
	var canvasLeft = mapContainerRect.left + window.pageXOffset;
	var canvasTop = mapContainerRect.top + window.pageYOffset;
	// Set canvas position
	overlayCanvas.style.left = Math.round(canvasLeft) + 'px';
	overlayCanvas.style.top = Math.round(canvasTop) + 'px';
	
	overlayCanvas.width = mapContainer.clientWidth;
	overlayCanvas.height = mapContainer.clientHeight;
}

// Function to plot river stations as markers on the Leaflet map
function plotStations(stations) {
	stations.forEach(station => {
		// Destructure the station object
		const { site, name, latlon: [lat, lon] } = station;

		// Create a marker for the station
		const marker = L.marker([lat, lon]).addTo(stnGroup);

		// Create the popup content
		const popupContent = `<b>${name}</b><br><a href="${site}" target="_blank">Link</a>`;

		// Bind the popup to the marker
		marker.bindPopup(popupContent);
	});
}
