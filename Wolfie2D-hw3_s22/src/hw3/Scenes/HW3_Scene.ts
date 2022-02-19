import AABB from "../../Wolfie2D/DataTypes/Shapes/AABB";
import Vec2 from "../../Wolfie2D/DataTypes/Vec2";
import GameNode from "../../Wolfie2D/Nodes/GameNode";
import Graphic from "../../Wolfie2D/Nodes/Graphic";
import { GraphicType } from "../../Wolfie2D/Nodes/Graphics/GraphicTypes";
import AnimatedSprite from "../../Wolfie2D/Nodes/Sprites/AnimatedSprite";
import Label from "../../Wolfie2D/Nodes/UIElements/Label";
import { UIElementType } from "../../Wolfie2D/Nodes/UIElements/UIElementTypes";
import Scene from "../../Wolfie2D/Scene/Scene";
import Color from "../../Wolfie2D/Utils/Color";
import RandUtils from "../../Wolfie2D/Utils/RandUtils";
import RockAI from "../AI/RockAI";
import BulletBehavior from "../AI/BulletAI";
import { Homework3Animations, Homework3Event, Homework3Shaders } from "../HW3_Enums";
import CarPlayerController from "../AI/CarPlayerController";
import Circle from "../../Wolfie2D/DataTypes/Shapes/Circle";
import GameOver from "./GameOver";
import ShaderType from "../../Wolfie2D/Rendering/WebGLRendering/ShaderType";
import Sprite from "../../Wolfie2D/Nodes/Sprites/Sprite";
import CanvasNode from "../../Wolfie2D/Nodes/CanvasNode";
import Shape from "../../Wolfie2D/DataTypes/Shapes/Shape";
import Timer from "../../Wolfie2D/Timing/Timer";

/**
 * In Wolfie2D, custom scenes extend the original scene class.
 * This gives us access to lifecycle methods to control our game.
 */
export default class Homework3_Scene extends Scene {
	// Here we define member variables of our game, and object pools for adding in game objects
	private player: AnimatedSprite;
	private playerDead: boolean = false;
	private playerHealth: number = 5;
	private playerinvincible: boolean = false;
	private mineralAmount: number = 0;
	private MIN_SPAWN_DISTANCE: number = 100;

	// Create an object pool for our bullets
	private MAX_BULLETS_SIZE = 5;
	private bullets: Array<Graphic> = new Array(this.MAX_BULLETS_SIZE);

	// Create an object pool for our rocks
	private MAX_NUM_ROCKS = 15;
	private INITIAL_NUM_ROCKS = 1;
	private rocks: Array<Sprite> = new Array(this.MAX_NUM_ROCKS);

	// Create an object pool for our minerals
	private MAX_NUM_MINERALS = 20;
	private minerals: Array<Graphic> = new Array(this.MAX_NUM_MINERALS);

	// Labels for the gui
	private mineralsLabel: Label;
	private healthLabel: Label;

	// Timers
	private rockTimer: number = 0;
	private ROCK_MAX_TIME: number = 0.5;	// Spawn an rock every 10 seconds
	private mineralTimer: number = 0;
	private MINERAL_MAX_TIME: number = 5; // Spawn a mineral every 5 seconds
	private gameEndTimer: number = 0;
	private GAME_END_MAX_TIME: number = 3;

	private gameScoreTimer: number = 0;

	// Other variables
	private WORLD_PADDING: Vec2 = new Vec2(64, 64);
	private ROCK_SPEED: number = 300;
	private ROCK_SPEED_INC: number = 10;

	private bg1: Sprite;
	private bg2: Sprite;

	// HOMEWORK 3 - TODO 
	/*
		You'll want to be sure to load in your own sprite here
	*/
	/*
	 * loadScene() overrides the parent class method. It allows us to load in custom assets for
	 * use in our scene.
	 */
	loadScene(){
		/* ##### DO NOT MODIFY ##### */
		// Load in the player car spritesheet
		this.load.spritesheet("player", "hw3_assets/spritesheets/cars.json");

		// Load in the background image
		this.load.image("desert_road", "hw3_assets/sprites/road.jpg");

		this.load.image("rock", "hw3_assets/sprites/stone.png");
	}

	/*
	 * startScene() allows us to add in the assets we loaded in loadScene() as game objects.
	 * Everything here happens strictly before update
	 */
	startScene(){
		/* ##### DO NOT MODIFY ##### */
		// Create a background layer
		this.addLayer("background", 0);

		// Add in the background image
		this.bg1 = this.add.sprite("desert_road", "background");
		this.bg2 = this.add.sprite("desert_road", "background");
		this.bg1.scale.set(1.5, 1.5);
		this.bg1.position.copy(this.viewport.getCenter());

		this.bg2.scale.set(1.5, 1.5);
		this.bg2.position = this.bg1.position.clone();
		this.bg2.position.add(this.bg1.sizeWithZoom.scale(0, -2));

		// Create a layer to serve as our main game - Feel free to use this for your own assets
		// It is given a depth of 5 to be above our background
		this.addLayer("primary", 5);

		// Initialize the player
		this.initializePlayer();
		
		// Initialize the UI
		this.initializeUI();

		// Initialize object pools
		this.initializeObjectPools();

		// Spawn some rocks to start the game
		for(let i = 0; i < this.INITIAL_NUM_ROCKS; i++){
			this.spawnRock();
		}

		// Initialize variables
		RockAI.SPEED = this.ROCK_SPEED;

		// Subscribe to events
		this.receiver.subscribe(Homework3Event.PLAYER_I_FRAMES_END);
		this.receiver.subscribe(Homework3Event.PLAYER_DEAD);
		this.receiver.subscribe(Homework3Event.SHOOT_BULLET);
		this.receiver.subscribe(Homework3Event.BULLET_USED);
	}

	/**
	 * To create the illusion of a never ending desert road, we maintain two identical background and move them as the game progresses.
	 * When one background is moved completely offscreen at the bottom, it will get moved back to the top to continue the cycle.
	 */
	moveBackgrounds(deltaT: number): void {
		let move = new Vec2(0, 150);
		this.bg1.position.add(move.clone().scaled(deltaT));
		this.bg2.position.add(move.clone().scaled(deltaT));

		let edgePos = this.viewport.getCenter().clone().add(this.bg1.sizeWithZoom.clone().scale(0, 2));

		if (this.bg1.position.y >= edgePos.y){
			this.bg1.position = this.viewport.getCenter().clone().add(this.bg1.sizeWithZoom.clone().scale(0, -2))
		}
		if (this.bg2.position.y >= edgePos.y){
			this.bg2.position = this.viewport.getCenter().clone().add(this.bg2.sizeWithZoom.clone().scale(0, -2))
		}
	}

	/*
	 * updateScene() is where the real work is done. This is where any custom behavior goes.
	 */
	updateScene(deltaT: number){
		// Handle events we care about
		this.handleEvents();

		this.moveBackgrounds(deltaT);

		this.handleCollisions();

		// Handle timers
		this.handleTimers(deltaT);

		// Get the viewport center and padded size
		const viewportCenter = this.viewport.getCenter().clone();
		const paddedViewportSize = this.viewport.getHalfSize().scaled(2).add(this.WORLD_PADDING.scaled(2));
		const baseViewportSize = this.viewport.getHalfSize().scaled(2);

		// Check the position of our player
		this.lockPlayer(viewportCenter, baseViewportSize);

		// Handle the despawing of all other objects that move offscreen
		for(let bullet of this.bullets){
			if(bullet.visible){
				this.handleScreenDespawn(bullet, viewportCenter, paddedViewportSize, true);
			}
		}

		for(let rock of this.rocks){
			if(rock.visible){
				this.handleScreenDespawn(rock, viewportCenter, paddedViewportSize, false);
			}
		}
	}

	/* #################### CUSTOM METHODS #################### */

	/* ########## START SCENE METHODS ########## */
	/**
	 * Creates and sets up our player object
	 */
	initializePlayer(): void {
		// Add in the player as an animated sprite
		// We give it the key specified in our load function and the name of the layer
		this.player = this.add.animatedSprite("player", "primary");
		
		// Set the player's position to the middle of the screen, and scale it down
		this.player.position.set(this.viewport.getCenter().x, this.viewport.getCenter().y);
		this.player.scale.set(0.4, 0.4);

		// Play the idle animation by default
		this.player.animation.play("driving");

		// Give the player a smaller hitbox
		console.log(this.player.sizeWithZoom.toString());
		console.log(this.player.size.toString());
		let playerCollider = new AABB(Vec2.ZERO, this.player.sizeWithZoom);
		this.player.setCollisionShape(playerCollider)

		// Add a playerController to the player
		this.player.addAI(CarPlayerController);
	}

	/**
	 * Creates all of our UI layer components
	 */
	initializeUI(): void {
		// UILayer stuff
		this.addUILayer("ui");

		// Minerals label
		this.mineralsLabel = <Label>this.add.uiElement(UIElementType.LABEL, "ui", {position: new Vec2(125, 50), text: `Minerals: ${this.mineralAmount}`});
		this.mineralsLabel.size.set(200, 50);
		this.mineralsLabel.setHAlign("left");
		this.mineralsLabel.textColor = Color.WHITE;

		// Health label
		this.healthLabel = <Label>this.add.uiElement(UIElementType.LABEL, "ui", {position: new Vec2(375, 50), text: `Health: ${this.playerHealth}`});
		this.healthLabel.size.set(200, 50);
		this.healthLabel.setHAlign("left");
		this.healthLabel.textColor = Color.WHITE;
	}

	/**
	 * Creates object pools for our items.
	 * For more information on object pools, look here:
	 * https://gameprogrammingpatterns.com/object-pool.html
	 */
	initializeObjectPools(): void {
		// Initialize the bullet object pool
		for(let i = 0; i < this.bullets.length; i++){
			this.bullets[i] = this.add.graphic(GraphicType.RECT, "primary", {position: new Vec2(0, 0), size: new Vec2(50, 50)});

			// HOMEWORK 3 - TODO
			// Currently bullets use the base custom gradient circle shader, 
			// you'll need to change this to the Linear Gradient Circle once you get that shader working. 
			this.bullets[i].useCustomShader(Homework3Shaders.GRADIENT_CIRCLE);

			this.bullets[i].visible = false;
			// This is the color each bullet is set to by default, you can change this if you like a different color
			this.bullets[i].color = Color.BLUE;

			// Add AI to our bullet
			this.bullets[i].addAI(BulletBehavior, {speed: 250});

			// Add a collider to our bullet
			let collider = new Circle(Vec2.ZERO, 25);
			this.bullets[i].setCollisionShape(collider);
		}

		// Initialize the mineral object pool
		for(let i = 0; i < this.minerals.length; i++){
			this.minerals[i] = this.add.graphic(GraphicType.RECT, "primary", {position: new Vec2(0, 0), size: new Vec2(32, 32)});
			this.minerals[i].visible = false;
		}

		// Initialize the rock object pool
		for(let i = 0; i < this.rocks.length; i++){
			this.rocks[i] = this.add.sprite("rock", "primary");

			// Make our rock inactive by default
			this.rocks[i].visible = false;

			// Assign them an rock ai
			this.rocks[i].addAI(RockAI);

			this.rocks[i].scale.set(0.4, 0.4);

			// Give them a collision shape
			let collider = new AABB(Vec2.ZERO, this.rocks[i].sizeWithZoom);
			this.rocks[i].setCollisionShape(collider);
		}
	}

	// HOMEWORK 3 - TODO
	/**  
	 * This function spawns a bullet from the object pool. Your task is to randomly select either pink or yellow as it's color, and
	 * change it's speed accordingly. The second color of the linear gradient circle will be set in the LinearGradientCircleShaderType file.
	*/
	spawnBullet(position: Vec2): void {
		// Find the first viable bullet
		let bullet: Graphic = null;

		for(let b of this.bullets){
			if(!b.visible){
				// We found a dead bullet
				bullet = b;
				break;
			}
		}

		if(bullet !== null){
			// Spawn a bullet
			bullet.visible = true;
			bullet.position = position.add(new Vec2(0, -64));
			bullet.setAIActive(true, {speed: 250});
		}
	}

	// Spawns a new mineral into the world
	spawnMineral(): void {
		// Find the first viable mineral
		let mineral: Graphic = null;

		for(let m of this.minerals){
			if(!m.visible){
				// We found a dead mineral
				mineral = m;
				break;
			}
		}

		if(mineral !== null){
			// Bring this mineral to life
			mineral.visible = true;

			let viewportSize = this.viewport.getHalfSize().scaled(2);
			// Loop on position until we're clear of the player
			mineral.position = RandUtils.randVec(0, viewportSize.x, 0, viewportSize.y);

			while(mineral.position.distanceTo(this.player.position) < this.MIN_SPAWN_DISTANCE){
				mineral.position = RandUtils.randVec(0, viewportSize.x, 0, viewportSize.y);
			}
		}
	}

	/* ############################## */

	/* ########## UPDATE SCENE METHODS ########## */
	
	/**
	 * Handles all events we care about in the update cycle.
	 * Gets all events from the receiver this frame, and reacts to them accordingly
	 */
	handleEvents(){
		while(this.receiver.hasNextEvent()){
			let event = this.receiver.getNextEvent();

			if(event.type === Homework3Event.PLAYER_I_FRAMES_END){
				this.playerinvincible = false;
			}

			if(event.type === Homework3Event.PLAYER_DEAD){
				this.playerDead = true;
			}

			if(event.type === Homework3Event.SHOOT_BULLET){
				this.spawnBullet(event.data.get("position"));
			}

			if(event.type === Homework3Event.BULLET_USED){
				// Bullet has died, hide them
				this.sceneGraph.getNode(event.data.get("id")).visible = false;
			}
		}
	}

	/**
	 * Updates all of our timers and handles timer related functions
	 */
	handleTimers(deltaT: number): void {
		this.rockTimer += deltaT;
		this.mineralTimer += deltaT;
		this.gameScoreTimer += deltaT;

		if(this.playerDead) this.gameEndTimer += deltaT;

		if(this.rockTimer > this.ROCK_MAX_TIME){
			// Spawn an rock at a random location (not near the player)
			this.rockTimer -= this.ROCK_MAX_TIME;
			this.spawnRock();
		}

		if(this.mineralTimer > this.MINERAL_MAX_TIME){
			// Spawn a mineral at a random location (not near the player)
			this.mineralTimer -= this.MINERAL_MAX_TIME;
			this.spawnMineral();
		}

		if(this.gameEndTimer > this.GAME_END_MAX_TIME){
			// End the game
			this.sceneManager.changeToScene(GameOver, {score: this.gameScoreTimer, minerals: this.mineralAmount}, {});
		}
	}

	// HOMEWORK 3 - TODO
	/**
	 * Handles all collisions.
	 * Collisions only occur between:
	 * 	-Bullets and rock
	 *	-The player and rocks
	 * 	-The player and minerals
	 * 
	 * The collision type is AABB to Circle for collisions with rocks.
	 * 
	 * Collisions between the player and minerals and players and rocks are already working just fine.
	 * These are AABB to AABB collisions. You can check out the code for that in the AABB class
	 * for some inspiration for your own collision detection.
	 * 
	 * You'll have to implement collision detection for AABBs and Circles. This is in another TODO,
	 * but it is used here.
	 * 
	 * For this TODO, you'll be handling the response to when a bullet collides with an rock.
	 * 
	 * Also, when the player collides with an rock, several things must happen:
	 * 
	 *	1) The rock must be "destroyed". We control alive/dead status with the "visible" field.
	 *	2) The player must be damaged. This has two parts to it.
	 *		i) The player health, which is tracked here, must decrease, and the player should become invincible.
	 *		ii) We must send an event to the EventQueue saying that the player has been damaged. You'll have to go 
	 			into the CarPlayerController class and make sure it is  subscribed to these types of events.
				For event data, we must include the health level after the player takes damage. This data is
				important for knowing when the player dies. You'll know yours is working if you go to a game over
				screen once you lose all of your health.
		3) The text of the GUI must be updated.
	 */
	handleCollisions(){
		/* ########## DO NOT MODIFY THIS CODE ########## */

		// Check for mineral collisions
		for(let mineral of this.minerals){
			if(mineral.visible && this.player.collisionShape.overlaps(mineral.boundary)){
				// A collision happened - destroy the mineral
				mineral.visible = false;

				// Increase the minerals available to the player
				this.mineralAmount += 1;

				// Update the gui
				this.mineralsLabel.text = `Minerals: ${this.mineralAmount}`;
			}
		}

		// Check for collisions of bullets with rocks
		for(let rock of this.rocks){
			// If the rock is spawned
			if(rock.visible){
				for(let bullet of this.bullets){
					// If the bullet is spawned, isn't already dying, and overlaps the rock
					if(bullet.visible &&
						Homework3_Scene.checkAABBtoCircleCollision(<AABB>rock.collisionShape, <Circle>bullet.collisionShape)
					){
						// Kill rock
						rock.visible = false;

						// Send out an event to destroy the bullet
						this.emitter.fireEvent(Homework3Event.BULLET_USED, {id: bullet.id});

						// Exit early - we only need to destroy one bullet
						break;
					}
				}
			}
		}

		/* ########## #################### ########## */
		/* ########## YOU CAN CHANGE THE CODE BELOW THIS LINE ########## */

		// If the player is not invincible (e.g. they just got hit by an rock last frame),
		// check for rock collisions
		if(!this.playerinvincible){
			for(let rock of this.rocks){
				// If the rock is spawned in and it overlaps the player
				if(rock.visible && this.player.collisionShape.overlaps(rock.boundary)){
					// Put your code here:
				}
			}
		}
	}

	/**
	 * This function spawns a new rock from our object pool.
	 */
	spawnRock(): void {
		// Find the first viable rock
		let rock: Sprite = null;

		for(let r of this.rocks){
			if(!r.visible){
				// We found a dead rock
				rock = r;
				break;
			}
		}

		if(rock !== null){
			// Bring this rock to life
			rock.visible = true;

			// Extract the size of the viewport
			let viewportSize = this.viewport.getHalfSize().scaled(2);

			// Loop on position until we're clear of the player
			rock.position = RandUtils.randVec(0, viewportSize.x, 0, 0);
			while(rock.position.distanceTo(this.player.position) < this.MIN_SPAWN_DISTANCE){
				rock.position = RandUtils.randVec(0, viewportSize.x, 0, viewportSize.y);
			}

			rock.setAIActive(true, {});
			RockAI.SPEED += this.ROCK_SPEED_INC;

		}
	}

	// HOMEWORK 3- TODO
	/**
	 * This function takes in a GameNode that may be out of bounds of the viewport and
	 * "kills" it as if it was destroyed through usual collision. This is done so that
	 * the object pools are refreshed since once an object is offscreen, it's out of use.
	 * 
	 * You'll notice if you play the game without changing any of the code, rocks will suddenly stop coming,
	 * and you'll no longer be able to fire bullets after a few click. This is because all of those objects
	 * are still active in the scene, just out of sight, so to our object pools we've used up all valid objects.
	 * 
	 * Keep in mind while implementing this that JavaScript's % operator does a remainder operation,
	 * not a modulus operation:
	 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Remainder
	 * 
	 * Also keep in mind that the despawn area in this case is padded, meaning that a GameNode can go off
	 * the side of the viewport by the padding amount in any direction before it will be despawned
	 * 
	 * A visualization of the padded viewport is shown below. o's represent valid locations for GameNodes,
	 * X's represent invalid locations.
	 * 
	 * Since objects will only move in the vertical direction, you only need to handle this for the Y position.
	 * 
	 * 					 X	 THIS IS OUT OF BOUNDS
	 * 			 _______________________________________________
	 * 			|	 THIS IS THE PADDED REGION (OFF SCREEN)		|
	 * 			|						o						|
	 * 			|		 _______________________________		|
	 * 			|		|								|		|
	 * 			|		|								|		|
	 *	 		|		|	  THIS IS THE VISIBLE		|		|
	 * 			|		|			 REGION				|		|
	 * 			|		|								|		|
	 * 			|		|		o						|		|
	 * 			|		|_______________________________|		|
	 * 			|							o					|
	 * 			|_______________________________________________|
	 * 
	 * 							X THIS IS OUT OF BOUNDS
	 * 
	 * Also note that there's a field isBullet to determine whether you're handling bullet despawning or rock despawning.
	 * Bullet despawning needs to fire an event Homework3Event.BULLET_USED with the id of the node, while rock despawning only
	 * needs to set the visible field to false. You can see how despawning is handled in the handleCollision function.
	 * 
	 * It may be helpful to make your own drawings while figuring out the math for this part.
	 * 
	 * @param node The node to wrap around the screen
	 * @param viewportCenter The center of the viewport
	 * @param paddedViewportSize The size of the viewport with padding
	 * @param isBullet True if the node is a bullet, false if the node is a rock
	 */
	handleScreenDespawn(node: CanvasNode, viewportCenter: Vec2, paddedViewportSize: Vec2, isBullet: boolean): void {
		// Your code goes here:
	}

	// HOMEWORK 3 - TODO (3. BOUND CAR)
	/**
	 * This function is similar to the despawn function above, except there's no padded area since we
	 * want tight bounds. Using a similar illustration from above:
	 * 
	 * o's represent valid locations for the player,
	 * X's represent invalid locations.
	 * 
	 * 								X
	 * 			 _______________________________		
	 * 			|						o		|	
	 * 			|								|		
	 *			X	  THIS IS THE VISIBLE		|	
	 * 			|			 REGION				|		
	 * 			|								|	
	 * 		X	|		o						|		
	 * 			|_______________________________|		
	 * 
	 * Note that the player cannot be halfway off the screen either vertically or horizontally, it must always be fully visible
	 * 								
	 * @param viewportCenter The center of the viewport
	 * @param viewportSize The size of the viewport
	 */
	lockPlayer(viewportCenter: Vec2, viewportSize: Vec2): void {
		//REMOVE
		// Your code goes here:
	}

	// HOMEWORK 3 - TODO (2. collision)
	/**
	 * This method checks whether or not an AABB collision shape and a Circle collision shape
	 * overlap with each other.
	 * 
	 * An AABB is an axis-aligned bounding box, it is a rectangle that will always be aligned to the
	 * x-y grid.
	 * 
	 * You will very likely want to draw out examples of this collision while thinking about how
	 * to write this function, and you will want to test it vigorously. An algorithm that works
	 * only most of the time is not an algorithm. If a player is able to break your game, they
	 * will find a way to do so.
	 * 
	 * You can test this method independently by writing some code in main.ts.
	 * 
	 * Although it talks about AABB collisions exclusively, you may find this resource helpful:
	 * https://noonat.github.io/intersect/
	 * 
	 * There are many ways to solve this problem, so get creative! There is not one single solution
	 * we're looking for. Just make sure it works by thoroughly testing it.
	 * 
	 * @param aabb The AABB collision shape
	 * @param circle The Circle collision shape
	 * @returns True if the two shapes overlap, false if they do not
	 */
	static checkAABBtoCircleCollision(aabb: AABB, circle: Circle): boolean {
		//REMOVE
		// Your code goes here:
		return false;
	}

}