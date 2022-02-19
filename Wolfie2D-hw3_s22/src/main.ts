import Game from "./Wolfie2D/Loop/Game";
import { Homework3Shaders } from "./hw3/HW3_Enums";
import GradientCircleShaderType from "./hw3/GradientCircleShaderType";
import MainMenu from "./hw3/Scenes/MainMenu";
import AABB from "./Wolfie2D/DataTypes/Shapes/AABB";
import Vec2 from "./Wolfie2D/DataTypes/Vec2";
import Circle from "./Wolfie2D/DataTypes/Shapes/Circle";
import Homework3_Scene from "./hw3/Scenes/HW3_Scene";
import RegistryManager from "./Wolfie2D/Registry/RegistryManager";
import LinearGradientCircleShaderType from "./hw3/LinearGradientCircleShaderType";

// The main function is your entrypoint into Wolfie2D. Specify your first scene and any options here.
(function main(){
    // Note - just because your program passes all of these tests does not mean your algorithm works.
    // The tests should cover most cases, but run your own to be sure
    runTests();

    // Set up options for our game
    let options = {
        canvasSize: {x: 900, y: 900},          // The size of the game
        clearColor: {r: 0.1, g: 0.1, b: 0.1},   // The color the game clears to
        inputs: [
            { name: "forward", keys: ["w"] },   // Forward is assigned to w
            { name: "backward", keys: ["s"] },  // and so on...
            { name: "left", keys: ["a"] },
            { name: "right", keys: ["d"] },
        ],
        useWebGL: true,                        // Tell the game we want to use webgl
        showDebug: false                       // Whether to show debug messages. You can change this to true if you want
    }

    // We have a custom shader, so lets add it to the registry and preload it
    // The registry essentially just ensures that we can locate items by name later, rather than needing
    // the class constructor. Here, we additionally make sure to preload the data so our
    // shader is available throughout the application
    RegistryManager.shaders.registerAndPreloadItem(
        Homework3Shaders.GRADIENT_CIRCLE,   // The key of the shader program
        GradientCircleShaderType,           // The constructor of the shader program
        "hw3_assets/shaders/gradient_circle.vshader",   // The path to the vertex shader
        "hw3_assets/shaders/gradient_circle.fshader");  // the path to the fragment shader*/

    // This is the custom shader that you'll implement, although currently it's exactly the same as our gradient circle shader
    RegistryManager.shaders.registerAndPreloadItem(
        Homework3Shaders.LINEAR_GRADIENT_CIRCLE,   // The key of the shader program
        LinearGradientCircleShaderType,           // The constructor of the shader program
        "hw3_assets/shaders/linear_gradient_circle.vshader",   // The path to the vertex shader
        "hw3_assets/shaders/linear_gradient_circle.fshader");  // the path to the fragment shader*/

    // Create a game with the options specified
    const game = new Game(options);

    // Start our game
    game.start(MainMenu, {});
})();

function runTests(){
    let aabb = new AABB(Vec2.ZERO, new Vec2(1, 1));
    let circle = new Circle(Vec2.ZERO, 1);

    // Both at (0, 0), should overlap
    hw3_CollisionTest(aabb, circle, true, "Overlap when both at (0, 0) not detected");

    circle.center.x = 1;
    // Overlap, but not same center
    hw3_CollisionTest(aabb, circle, true, "Overlap not detected");

    circle.center.x = 2;
    // Circle is touching right side of AABB
    hw3_CollisionTest(aabb, circle, true, "Overlap on right side of AABB not detected");

    circle.center.x = -2;
    // Circle is touching left side of AABB
    hw3_CollisionTest(aabb, circle, true, "Overlap or left side of AABB not detected");

    circle.center.x = 0;
    circle.center.y = -2;
    // Circle is touching top of AABB
    hw3_CollisionTest(aabb, circle, true, "Overlap on top of AABB not detected");

    circle.center.y = 2;
    // Circle is on bottom of AABB
    hw3_CollisionTest(aabb, circle, true, "Overlap on bottom of AABB not detected");

    circle.center.x = -2;
    circle.center.y = -2;
    // No collision - circle is too far away from the corner
    hw3_CollisionTest(aabb, circle, false, "Overlap detected when none is occurring");
 
    // To prevent floating point errors, we subtract a small number from the sqrt
    circle.center.x = -Math.sqrt(2)-0.0000001;
    circle.center.y = -Math.sqrt(2)-0.0000001;
    // Collision - circle is touching the top left corner
    hw3_CollisionTest(aabb, circle, true, "Overlap on top left corner of AABB not deteced");

    // Check other corners
    circle.center.x = 1
    circle.center.y = -1
    hw3_CollisionTest(aabb, circle, true, "Overlap on top right corner of AABB not deteced");

    circle.center.x = -1
    circle.center.y = 1.2
    hw3_CollisionTest(aabb, circle, true, "Overlap on bottom left corner of AABB not deteced");

    circle.center.x = 1.4
    circle.center.y = 1.4
    hw3_CollisionTest(aabb, circle, true, "Overlap on bottom right corner of AABB not deteced");
}

function hw3_CollisionTest(aabb: AABB, circle: Circle, value: boolean, message: string){
    console.assert(
        Homework3_Scene.checkAABBtoCircleCollision(aabb, circle) === value,
        {
            aabb: aabb.toString(),
            circle: circle.toString(),
            errorMsg: message
        });
}