// Create a viewer
var viewer = new Cesium.Viewer('cesiumContainer', {
    shadows : true
});

//Enable lighting based on sun/moon positions
viewer.scene.globe.enableLighting = true;
//Enable depth testing so things behind the terrain disappear.
viewer.scene.globe.depthTestAgainstTerrain = true;

//Load STK World Terrain
viewer.terrainProvider = new Cesium.CesiumTerrainProvider({
    url : 'https://assets.agi.com/stk-terrain/world',
    requestWaterMask : true,
    requestVertexNormals : true // required for terrain lighting
});

// Set bounds of our simulation time
var start = Cesium.JulianDate.fromDate(new Date(2015, 2, 25, 16));
var stop = Cesium.JulianDate.addSeconds(start, 360, new Cesium.JulianDate());

//Make sure viewer is at the desired time.
viewer.clock.startTime = start.clone();
viewer.clock.stopTime = stop.clone();
viewer.clock.currentTime = start.clone();
viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP; //Loop at the end
viewer.clock.multiplier = 10;

//Set timeline to simulation bounds
viewer.timeline.zoomTo(start, stop);

var drone;

// Create some random points
function computePoints(lon, lat, radius) {
    var property = new Cesium.SampledPositionProperty();
    for (var i = 0; i <= 360; i += 45) {
        var radians = Cesium.Math.toRadians(i);
        var time = Cesium.JulianDate.addSeconds(start, i, new Cesium.JulianDate());
        var position = Cesium.Cartesian3.fromDegrees(lon + (radius * 1.5 * Math.cos(radians)), lat + (radius * Math.sin(radians)), Cesium.Math.nextRandomNumber() * 500 + 1750);
        property.addSample(time, position);

        // Also create a point for each sample we generate.
        var point = viewer.entities.add({
            position : position,
            point : {
                pixelSize : 10,
                color : Cesium.Color.YELLOW,
                heightReference : Cesium.HeightReference.CLAMP_TO_GROUND // Adjust point heights to sit on terrain
            }
        });
    }
    return property;
}

// Load a drone model with some basic styling
function createModel(url, height) {

    // Set a starting position in an interesting environment.
    var position = computePoints(-112.110693, 36.0994841, 0.01);

    //Automatically compute orientation based on position movement.
    var orientation = new Cesium.VelocityOrientationProperty(position),

        drone = viewer.entities.add({
            name : url,
            position : position,
            orientation : orientation,
            model : {
                uri : url,
                minimumPixelSize : 128,
                maximumScale : 2000
            }
        });
    viewer.trackedEntity = drone;

    // Interpolate smoothly between position sample points.
    drone.position.setInterpolationOptions({
        interpolationDegree : 2,
        interpolationAlgorithm : Cesium.HermitePolynomialApproximation
    });
}

createModel('../../Source/SampleData/Models/CesiumDrone.gltf', 2000.0);

// Zoom to our entity to start
viewer.zoomTo(drone, new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-90)));
