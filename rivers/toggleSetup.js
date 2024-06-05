const formatElapsedTime = (seconds) => {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = Math.floor(seconds % 60);
	return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const calculateDistance = (trail) => {
	return trail.reduce((acc, cur, idx, arr) => {
		if (idx === 0) return acc;
		return acc + arr[idx - 1].distanceTo(cur) / 1000;
	}, 0);
};

const drawOverlay = () => {
	// Draw user's trail
	if (trail.length > 1) {
		ctxm.beginPath();
		trail.forEach((point, i) => {
			const { x, y } = map.latLngToContainerPoint(point);
			if (i === 0) ctxm.moveTo(x, y);
			else ctxm.lineTo(x, y);
		});
		ctxm.strokeStyle = 'red';
		ctxm.lineWidth = 2;
		ctxm.stroke();
	}

	// Draw user's position arrow
	if (userPosition) {
		const userPoint = map.latLngToContainerPoint(userPosition);
		ctxm.save();
		ctxm.translate(userPoint.x, userPoint.y);
		ctxm.rotate(userHeading * Math.PI / 180);
		ctxm.beginPath();
		ctxm.moveTo(0, -15);
		ctxm.lineTo(10, 10);
		ctxm.lineTo(-10, 10);
		ctxm.closePath();
		ctxm.fillStyle = 'red';
		ctxm.fill();
		ctxm.restore();
	}
};

const updateLayout = () => {
	const speedHeight = toggleSpeed.checked ? 15 : 0;
	const tidesHeight = toggleTides.checked ? 25 : 0;
	const mapHeight = 100 - 10 - speedHeight - tidesHeight;

	speedCanvas.style.height = `${speedHeight}vh`;
	tidesCanvas.style.height = `${tidesHeight}vh`;
	mapContainer.style.height = `${mapHeight}vh`;
	
	speedCanvas.classList.toggle('active', toggleSpeed.checked);
	tidesCanvas.classList.toggle('active', toggleTides.checked);

	map.invalidateSize();
	overlayCanvas.width = overlayCanvas.clientWidth;
	overlayCanvas.height = overlayCanvas.clientHeight;
};

const updateUserPosition = (position) => {
	const { latitude, longitude, speed, heading } = position.coords;
	userPosition = new L.LatLng(latitude, longitude);
	userSpeed = speed*3.6 || 0;
	userHeading = heading || 0;

	// Update trail
	if (!trail.length || !trail[trail.length - 1].equals(userPosition)) {
		trail.push(userPosition);
	}

	// Update speed canvas information
	const currentTime = new Date();
	const elapsedTime = (currentTime - startTime) / 1000; // in seconds
	const distance = calculateDistance(trail);

	speedDisplay.textContent = `${userSpeed.toFixed(1)} km/h`;
	timeDisplay.textContent = currentTime.toLocaleTimeString();
	distanceDisplay.textContent = `${distance.toFixed(2)} km`;
	elapsedDisplay.textContent = formatElapsedTime(elapsedTime);

	if (isFollowing) {
		map.setView(userPosition);
	}
};

const updatePosition = () => {
	if (navigator.geolocation) {
		navigator.geolocation.watchPosition(updateUserPosition, console.error, {
			enableHighAccuracy: true,
			maximumAge: 0,
			timeout: 5000
		});
	}
};

