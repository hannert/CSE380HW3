precision mediump float;

varying vec4 v_Position;

uniform vec4 circle_ColorBottomLeft;
uniform vec4 circle_ColorUpperRight;


// HOMEWORK 3 - TODO
/*
	The fragment shader is where pixel colors are decided.
	You'll have to modify this code to make the circle vary between 2 colors.
	Currently this will render the exact same thing as the gradient_circle shaders
*/
void main(){
	// Default alpha is 0
	float alpha = 0.0;

	// Radius is 0.5, since the diameter of our quad is 1
	float radius = 0.5;

	// Get the distance squared of from (0, 0)
	float dist_sq = v_Position.x*v_Position.x + v_Position.y*v_Position.y;

	
	if(dist_sq < radius*radius){
		// Multiply by 4, since distance squared is at most 0.25
		alpha = 1.0;
	} 

	float aSquared = (pow(v_Position.y + 0.5, 2.0));
	float bSquared = (pow(v_Position.x + 0.5, 2.0));
	float percentage = sqrt(aSquared + bSquared);
	float topRight = sqrt(pow((radius*2.0), 2.0) + pow((radius*2.0), 2.0));
	vec4 newColor =	mix(circle_ColorBottomLeft, circle_ColorUpperRight, percentage/topRight);

	// Use the alpha value in our color
	gl_FragColor = vec4(newColor);
	gl_FragColor.a = alpha;
}