let map3DElement = null;

async function init() {
  const { Map3DElement } = await google.maps.importLibrary("maps3d");
  map3DElement = new Map3DElement({
    center: { lat: 0, lng: 0, altitude: 16000000 },
  });
  document.body.append(map3DElement);
  initAutocomplete();
}

async function initAutocomplete() {
  const { Autocomplete } = await google.maps.importLibrary("places");
  const autocomplete = new Autocomplete(document.getElementById("pac-input"), {
    fields: ["geometry", "name", "place_id"],
  });
  autocomplete.addListener("place_changed", () => {
    const place = autocomplete.getPlace();
    if (!place.geometry || !place.geometry.viewport) {
      window.alert("No viewport for input: " + place.name);
      return;
    }
    zoomToViewport(place.geometry);
    promptForService();
  });
}

const zoomToViewport = async (geometry) => {
  const { AltitudeMode, Polyline3DElement } = await google.maps.importLibrary(
    "maps3d"
  );
  let viewport = geometry.viewport;
  let locationPoints = [
    { lat: viewport.getNorthEast().lat(), lng: viewport.getNorthEast().lng() },
    { lat: viewport.getSouthWest().lat(), lng: viewport.getNorthEast().lng() },
    { lat: viewport.getSouthWest().lat(), lng: viewport.getSouthWest().lng() },
    { lat: viewport.getNorthEast().lat(), lng: viewport.getSouthWest().lng() },
    { lat: viewport.getNorthEast().lat(), lng: viewport.getNorthEast().lng() },
  ];
  let locationPolyline = new Polyline3DElement({
    altitudeMode: AltitudeMode.CLAMP_TO_GROUND,
    strokeColor: "blue",
    strokeWidth: 10,
    coordinates: locationPoints,
  });
  map3DElement.append(locationPolyline);
  console.log(locationPolyline);
  let elevation = await getElevationforPoint(geometry.location);
  if (map3DElement) {
    const flyToCamera = {
      center: {
        lat: geometry.location.lat(),
        lng: geometry.location.lng(),
        altitude: elevation + 50,
      },
      tilt: 55,
      range: 1000,
    };
    map3DElement.flyCameraTo({
      endCamera: flyToCamera,
      durationMillis: 5000,
    });
  }
};

async function getElevationforPoint(location) {
  const { ElevationService } = await google.maps.importLibrary("elevation");
  const elevatorService = new google.maps.ElevationService();
  const elevationResponse = await elevatorService.getElevationForLocations({
    locations: [location],
  });
  if (!(elevationResponse.results && elevationResponse.results.length)) {
    window.alert(`Insufficient elevation data for the selected location.`);
    return 10; // Default elevation if none is available
  }
  const elevation = elevationResponse.results[0].elevation || 10;
  return elevation;
}

// Function to prompt the user for the desired service
function promptForService() {
  const serviceContainer = document.getElementById("service-container");
  serviceContainer.style.display = "block";

  const searchButton = document.getElementById("search-service-button");
  searchButton.addEventListener("click", () => {
    const service = document.getElementById("service-input").value.trim();
    if (service) {
      searchNearbyPlaces(service);
    } else {
      alert("Please enter a service to search for.");
    }
  });
}

// Function to search for nearby places based on the service
async function searchNearbyPlaces(service) {
  const { PlacesService } = await google.maps.importLibrary("places");
  const serviceLocation = map3DElement.center; // Assuming this gets the current center

  // Create a dummy 2D map instance to use the PlacesService
  const dummyMap = new google.maps.Map(document.createElement("div"));
  const placesService = new PlacesService(dummyMap);

  const request = {
    location: new google.maps.LatLng(serviceLocation.lat, serviceLocation.lng),
    radius: "5000", // 5 km radius
    keyword: service,
  };

  placesService.nearbySearch(request, (results, status) => {
    if (status === google.maps.places.PlacesServiceStatus.OK && results) {
      clearMarkers();
      results.forEach((place) => {
        addMarker(place.geometry.location, place.name);
      });
    } else {
      alert("No places found matching your request.");
    }
  });
}

// Function to add a marker to the map
async function addMarker(location, title) {
  const { Marker3DElement, AltitudeMode } = await google.maps.importLibrary(
    "maps3d"
  );

  // Fetch elevation for the location to set the marker altitude
  const elevation = await getElevationforPoint(location);

  const marker = new Marker3DElement({
    position: {
      lat: location.lat(),
      lng: location.lng(),
      altitude: elevation + 10, // Slightly above ground
    },
    altitudeMode: "RELATIVE_TO_GROUND",
    extruded: true,
    // Optional: Customize marker appearance
    // For example, you can set a 3D model or color
    // model: 'path/to/model.gltf',
    // color: '#FF0000',
    title: title,
  });

  map3DElement.append(marker);
}

// Function to clear existing markers from the map
function clearMarkers() {
  document.querySelectorAll("gmp-marker-3d").forEach(marker => {
    marker.remove();
  })
}

init();
