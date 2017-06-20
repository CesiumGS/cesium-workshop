    //////////////////////////////////////////////////////////////////////////
    // Viewer initialization
    //////////////////////////////////////////////////////////////////////////

    var viewer = new Cesium.Viewer('cesiumContainer', {
        scene3DOnly: true,
        selectionIndicator: false,
        navigationHelpButton: false
    });

    // Set the initial camera view
    var initialPosition = Cesium.Cartesian3.fromDegrees(-74.01881302800248, 40.69114333714821, 753.2406554180401);
    var initialOrientation = new Cesium.HeadingPitchRoll.fromDegrees(21.27879878293835, -21.34390550872461, 0.0716951918898415);
    viewer.scene.camera.setView({
        destination: initialPosition,
        orientation: {
            heading: initialOrientation.heading,
            pitch: initialOrientation.pitch,
            roll: initialOrientation.roll
        },
        endTransform: Cesium.Matrix4.IDENTITY
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
    viewer.clock.shouldAnimate = false;
    viewer.clock.clockStep = Cesium.ClockStep.TICK_DEPENDENT;
    viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;
    viewer.clock.multiplier = 60;
    viewer.clock.startTime = Cesium.JulianDate.fromIso8601("2016-08-01T04:00:00Z");
    viewer.clock.stopTime = Cesium.JulianDate.fromIso8601("2016-08-02T04:00:00Z");
    viewer.clock.currentTime = Cesium.JulianDate.fromIso8601("2016-08-01T16:00:00Z");
    viewer.timeline.zoomTo(viewer.clock.startTime, viewer.clock.stopTime);
