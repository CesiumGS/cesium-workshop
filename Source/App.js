    //////////////////////////////////////////////////////////////////////////
    // Viewer configuration
    //////////////////////////////////////////////////////////////////////////

    var viewer = new Cesium.Viewer('cesiumContainer', {
        navigationHelpButton: false,
        scene3DOnly: true,
        selectionIndicator: false,
        baseLayerPicker: false
    });

    // Set the initial camera view
    var initialPosition = Cesium.Cartesian3.fromDegrees(-74.01881302800248, 40.69114333714821, 753);
    var initialOrientation = new Cesium.HeadingPitchRoll.fromDegrees(21.27879878293835, -21.34390550872461, 0.0716951918898415);
    viewer.scene.camera.setView({
        destination: initialPosition,
        orientation: {
            heading: initialOrientation.heading,
            pitch: initialOrientation.pitch,
            roll: initialOrientation.roll
        }
    });

    //Override the default home button
    viewer.homeButton.viewModel.command.beforeExecute.addEventListener(function (arg) {
        arg.cancel = true;
        viewer.scene.camera.flyTo({
            destination: initialPosition,
            orientation: {
                heading: initialOrientation.heading,
                pitch: initialOrientation.pitch,
                roll: initialOrientation.roll
            },
            endTransform: Cesium.Matrix4.IDENTITY,
            duration: 1.0
        });
    });

    //Set up clock and timeline.
    viewer.clock.shouldAnimate = true;
    viewer.clock.clockStep = Cesium.ClockStep.TICK_DEPENDENT;
    viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP; // loop at the end
    viewer.clock.multiplier = 60; // sets a speedup
    viewer.clock.startTime = Cesium.JulianDate.fromIso8601("2016-08-01T04:00:00Z");
    viewer.clock.stopTime = Cesium.JulianDate.fromIso8601("2016-08-02T04:00:00Z");
    viewer.clock.currentTime = Cesium.JulianDate.fromIso8601("2016-08-01T16:00:00Z");
    viewer.timeline.zoomTo(viewer.clock.startTime, viewer.clock.stopTime); // set visible range

    //Enable lighting based on sun/moon positions
    viewer.scene.globe.enableLighting = true;

    //////////////////////////////////////////////////////////////////////////
    // Loading Imagery
    //////////////////////////////////////////////////////////////////////////

    Cesium.BingMapsApi.defaultKey = 'AsarFiDvISunWhi137V7l5Bu80baB73npU98oTyjqKOb7NbrkiuBPZfDxgXTrGtQ'; // For use on cesiumjs.org only

    // Add Bing imagery
    viewer.imageryLayers.addImageryProvider(new Cesium.BingMapsImageryProvider({
        url : 'https://dev.virtualearth.net',
        mapStyle: Cesium.BingMapsStyle.AERIAL // Can also use Cesium.BingMapsStyle.ROADS
    }));

    //////////////////////////////////////////////////////////////////////////
    // Loading Terrain
    //////////////////////////////////////////////////////////////////////////

    //Load STK World Terrain
    viewer.terrainProvider = new Cesium.CesiumTerrainProvider({
        url : 'https://assets.agi.com/stk-terrain/world',
        requestWaterMask : true, // required for water effects
        requestVertexNormals : true // required for terrain lighting
    });
    //Enable depth testing so things behind the terrain disappear.
    viewer.scene.globe.depthTestAgainstTerrain = true;

    //////////////////////////////////////////////////////////////////////////
    // Loading Data
    //////////////////////////////////////////////////////////////////////////

    var geojsonOptions = {
        markerSize : 40,
        markerSymbol : '!',
        clampToGround : true
    };
    // Load points of interest from a GeoJson
    var pointsPromise = Cesium.GeoJsonDataSource.load('./Source/SampleData/pointsOfInterest.geojson', geojsonOptions);


    var kmlOptions = {
        camera : viewer.scene.camera,
        canvas : viewer.scene.canvas
    };
    // Load neighborhood boundaries from KML file
    var neighborhoodsPromise = Cesium.KmlDataSource.load('./Source/SampleData/neighborhoods.kml', kmlOptions);

    //////////////////////////////////////////////////////////////////////////
    // Styling Data
    //////////////////////////////////////////////////////////////////////////

    var distanceDisplayCondition = new Cesium.DistanceDisplayCondition(10.0, 10000.0);
    var neighborhoods = viewer.entities.add(new Cesium.Entity());
    neighborhoodsPromise.then(function(dataSource) {
        // Add the new data as entities to the viewer
        viewer.dataSources.add(dataSource);

        // Get the array of entities
        var entities = dataSource.entities.values;

        for (var i = 0; i < entities.length; i++) {
            var entity = entities[i];
            var name = entity.id;

            if (Cesium.defined(entity.polygon)) {
                //Set the polygon material to a random, translucent color.
                entity.polygon.material = Cesium.Color.fromRandom({
                    red : 0.1,
                    maximumGreen : 0.5,
                    minimumBlue : 0.5,
                    alpha : 0.6
                });
                // Make the polygon conform to terrain.
                entity.polygon.height = undefined;
                entity.polygon.heightReference = Cesium.HeightReference.CLAMP_TO_GROUND;
                // Add to the neighborhoods group
                entity.parent = neighborhoods;
                // Generate Polygon center
                var poly_center = Cesium.BoundingSphere.fromPoints(entity.polygon.hierarchy.getValue().positions).center;
                poly_center = Cesium.Ellipsoid.WGS84.scaleToGeodeticSurface(poly_center);
                entity.position = poly_center;
                // Generate labels
                entity.label = new Cesium.LabelGraphics({
                    text : entity.kml.extendedData.ntaname.value,
                    showBackground : true,
                    scale : 0.6,
                    horizontalOrigin : Cesium.HorizontalOrigin.CENTER,
                    verticalOrigin : Cesium.VerticalOrigin.BOTTOM,
                    distanceDisplayCondition : distanceDisplayCondition,
                    disableDepthTestDistance : Number.POSITIVE_INFINITY
                });
            }
        }
        neighborhoods.show = false;
    });

    var points = viewer.entities.add(new Cesium.Entity());
    pointsPromise.then(function(dataSource) {
        // Add the new data as entities to the viewer
        viewer.dataSources.add(dataSource);

        // Get the array of entities
        var entities = dataSource.entities.values;

        for (var i = 0; i < entities.length; i++) {
            var entity = entities[i];
            if (Cesium.defined(entity.billboard)) {
                // Add to the points group
                entity.parent = points;

                // Add distance display condition
                entity.billboard.distanceDisplayCondition = distanceDisplayCondition;

                // modify description
                var cartographicPosition = Cesium.Cartographic.fromCartesian(entity.position.getValue(Cesium.JulianDate.now()));
                var latitude = Cesium.Math.toDegrees(cartographicPosition.latitude);
                var longitude = Cesium.Math.toDegrees(cartographicPosition.longitude);

                var description = '<table class="cesium-infoBox-defaultTable cesium-infoBox-defaultTable-lighter"><tbody>';
                description += '<tr><th>' + "Latitude" + '</th><td>' + latitude + '</td></tr>';
                description += '<tr><th>' + "Longitude" + '</th><td>' + longitude + '</td></tr>';
                description += '</tbody></table>';

                entity.description = description;
            }
        }

    });

    //////////////////////////////////////////////////////////////////////////
    // Import CityGML 3D Tileset
    //////////////////////////////////////////////////////////////////////////

    // Load the NYC buildings tileset
    var city = viewer.scene.primitives.add(new Cesium.Cesium3DTileset({
        url: 'https://cesiumjs.org/NewYork/3DTilesGml',
        maximumScreenSpaceError: 16 // default value
    }));

    // Current licensing attribution for the current tileset
    var currentCredits = [];
    currentCredits.push(new Cesium.Credit('Building data © OpenStreetMap contributors'));
    currentCredits.push(new Cesium.Credit('Download this 3D Tiles tileset', undefined, 'https://cesiumjs.org/NewYork/3DTiles/NewYork.zip'));
    // Add the attributes to the credits list.
    currentCredits.forEach(function (credit) {
        viewer.scene.frameState.creditDisplay.addDefaultCredit(credit);
    });

    // Adjust the tileset height so its not floating above terrain
    var heightOffset = -32;
    city.readyPromise.then(function(tileset) {
        // Position tileset
        var boundingSphere = tileset.boundingSphere;
        var cartographic = Cesium.Cartographic.fromCartesian(boundingSphere.center);
        var surface = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, 0.0);
        var offset = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, heightOffset);
        var translation = Cesium.Cartesian3.subtract(offset, surface, new Cesium.Cartesian3());
        tileset.modelMatrix = Cesium.Matrix4.fromTranslation(translation);
    });

    //////////////////////////////////////////////////////////////////////////
    // Style 3D Tileset
    //////////////////////////////////////////////////////////////////////////

    var defaultStyle = new Cesium.Cesium3DTileStyle({
        color : "color('white')",
        show : true
    });

    var transparentStyle = new Cesium.Cesium3DTileStyle({
        color : "color('white', 0.3)",
        show : true
    });

    var heightStyle = new Cesium.Cesium3DTileStyle({
        color : {
            conditions : [
                ["${height} >= 300", "rgba(45, 0, 75, 0.5)"],
                ["${height} >= 200", "rgb(102, 71, 151)"],
                ["${height} >= 100", "rgb(170, 162, 204)"],
                ["${height} >= 50", "rgb(224, 226, 238)"],
                ["${height} >= 25", "rgb(252, 230, 200)"],
                ["${height} >= 10", "rgb(248, 176, 87)"],
                ["${height} >= 5", "rgb(198, 106, 11)"],
                ["true", "rgb(127, 59, 8)"]
            ]
        }
    });

    city.readyPromise.then(function(tileset) {
        tileset.style = defaultStyle;
    });

    var tileStyle = document.getElementById('tileStyle');
    function set3DTileStyle() {
        var selectedStyle = tileStyle.options[tileStyle.selectedIndex].value;
        if (selectedStyle === 'none') {
            city.style = defaultStyle;
        } else if (selectedStyle === 'height') {
            city.style = heightStyle;
        } else if (selectedStyle === 'transparent') {
            city.style = transparentStyle;
        }
    }

    tileStyle.addEventListener('change', set3DTileStyle);

    //////////////////////////////////////////////////////////////////////////
    // 3D Models and time-dynamic properties
    //////////////////////////////////////////////////////////////////////////


    // Generate a random circular pattern with varying heights.
    // This will be replaced with CZML file once it's made.
    var start = viewer.clock.startTime;
    function computeCircularFlight(lon, lat, radius) {
        var lonRadians = Cesium.Math.toRadians(lon);
        var latRadians = Cesium.Math.toRadians(lat);
        var property = new Cesium.SampledPositionProperty();
        for (var i = 0; i <= 360; i += 45) {
            var offset = Cesium.Math.toRadians(i);
            var time = Cesium.JulianDate.addSeconds(start, i * 240, new Cesium.JulianDate());
            var position = Cesium.Cartesian3.fromRadians(lonRadians + (radius * 1.5 * Math.cos(offset)), latRadians + (radius * Math.sin(offset)), 500);
            property.addSample(time, position);
            //Also create a point for each sample we generate.
            viewer.entities.add({
                position : position,
                point : {
                    pixelSize : 8,
                    color : Cesium.Color.YELLOW
                }
            });
        }
        return property;
    }

    // Load drone 3D model
    // Set a starting position in an interesting environment.
    var position = Cesium.Cartesian3.fromDegrees(-74.01881302800247, 40.72694833660694, 700);
    var heading = Cesium.Math.toRadians(135);
    var pitch = 0;
    var roll = 0;
    var hpr = new Cesium.HeadingPitchRoll(heading, pitch, roll);
    var orientation = Cesium.Transforms.headingPitchRollQuaternion(position, hpr);

    position = computeCircularFlight(-73.95881302800247, 40.78694833660694, 0.0005)
    var drone = viewer.entities.add({
        //Set the entity availability to the same interval as the simulation time.
        availability : new Cesium.TimeIntervalCollection([new Cesium.TimeInterval({
            start : viewer.clock.startTime,
            stop : viewer.clock.stopTime
        })]),
        name : 'drone',
        position : position,
        orientation : new Cesium.VelocityOrientationProperty(position),
        model : {
            uri : './Source/SampleData/Models/CesiumDrone.gltf',
            minimumPixelSize : 128,
            maximumScale : 2000
        },
        //Show the path as a line sampled in 100 second increments.
        path : {
            resolution : 100,
            material : new Cesium.PolylineGlowMaterialProperty({
                glowPower : 0.1,
                color : Cesium.Color.YELLOW
            }),
            width : 10
        }
    });

    // Interpolate smoothly between position sample points.
    drone.position.setInterpolationOptions({
        interpolationDegree : 2,
        interpolationAlgorithm : Cesium.HermitePolynomialApproximation
    });

    //////////////////////////////////////////////////////////////////////////
    // Custom mouse interaction for highlighting and selecting
    //////////////////////////////////////////////////////////////////////////

    // If the mouse is over a point of interest, change the entity billboard scale and color
    var previousPickedEntity = undefined;
    var handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction(function(movement) {
        var pickedPrimitive = viewer.scene.pick(movement.endPosition);
        var pickedEntity = (Cesium.defined(pickedPrimitive)) ? pickedPrimitive.id : undefined;
        // Unhighlight the previously picked entity
        if (Cesium.defined(previousPickedEntity)) {
            previousPickedEntity.billboard.scale = 1.0;
            previousPickedEntity.billboard.color = Cesium.Color.WHITE;
        }
        // Highlight the currently picked entity
        if (Cesium.defined(pickedEntity) && Cesium.defined(pickedEntity.billboard)) {
            pickedEntity.billboard.scale = 2.0;
            pickedEntity.billboard.color = Cesium.Color.ORANGERED;
            previousPickedEntity = pickedEntity;
        }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);


    //////////////////////////////////////////////////////////////////////////
    // Setup Camera Modes
    //////////////////////////////////////////////////////////////////////////

    var freeModeElement = document.getElementById('freeMode');
    var droneModeElement = document.getElementById('droneMode');

    // Create a follow camera by using drone transformation to update camera
    var scratch = new Cesium.Matrix4();
    var camera =  viewer.scene.camera;
    function followDrone() {
        drone._getModelMatrix(viewer.clock.currentTime, scratch);
        camera.lookAtTransform(scratch, new Cesium.Cartesian3(-20, 0, 5));
    }

    function setCameraMode() {
        if(droneModeElement.checked) {
            viewer.scene.preRender.addEventListener(followDrone);
        } else {
            viewer.scene.preRender.removeEventListener(followDrone);
        }
    }

    freeModeElement.addEventListener('change', setCameraMode);
    droneModeElement.addEventListener('change', setCameraMode);

    //////////////////////////////////////////////////////////////////////////
    // Setup Display Options
    //////////////////////////////////////////////////////////////////////////

    var shadowsElement = document.getElementById('shadows');
    var neighborhoodsElement =  document.getElementById('neighborhoods');
    var distanceSliderElement = document.getElementById('distanceSlider');
    var distanceFieldElement = document.getElementById('distanceField');

    shadowsElement.addEventListener('change', function (e) {
        viewer.shadows = e.target.checked;
    });

    neighborhoodsElement.addEventListener('change', function (e) {
        neighborhoods.show = e.target.checked;
        tileStyle.value = 'transparent';
        city.style = transparentStyle;
    });

    // Update the distance display conditions whenever the slider or text input field change.
    function setDistanceDisplayCondition(farDistance) {
        distanceDisplayCondition.far = farDistance;
        for (i=0; i < points._children.length; ++i) {
            var entity = points._children[i];
            entity.billboard.distanceDisplayCondition = distanceDisplayCondition;
        }
    }
    distanceSliderElement.addEventListener('change', function (e) {
        distanceFieldElement.value = e.target.value;
        setDistanceDisplayCondition(e.target.value)
    });
    distanceFieldElement.addEventListener('change', function (e) {
        distancesliderElement.value = e.target.value;
        setDistanceDisplayCondition(e.target.value)
    });

    // Finally, wait for the initial city to be ready before removing the loading indicator.
    var loadingIndicator = document.getElementById('loadingIndicator');
    city.readyPromise.then(function () {
        loadingIndicator.style.display = 'none';
    });