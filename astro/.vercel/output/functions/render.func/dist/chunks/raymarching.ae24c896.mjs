const id = "raymarching.md";
const collection = "workshops";
const slug = "raymarching";
const body = "\n# Raymarching in Haxidraw\n\n### (Henry Bass, Advanced, 1hr)\n\nThe goal of this guide will be to simulate 3D environments, with realistic lighting and shadows. By the end, you should have something like this:\n\n<img src=\"https://cloud-4kaqtq8oi-hack-club-bot.vercel.app/0image.png\" width=\"512\"/>\n\nLet's start by thinking about how vision works in real life. Light rays come from sources such as the sun, bounce around, and eventually, some of them arrive at our eyes. We could simulate each ray coming from the light source, but this would be really slow. Most light rays miss our eyes, resulting in many redundant calculations. A better approach is to simulate the process of vision in reverse:\n\n- Shoot light rays from the camera\n- Find where and what they hit\n- From there, cast them in the direction of a light source, to see if they're in a shadow\n\n<img src=\"https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Ray_trace_diagram.svg/2560px-Ray_trace_diagram.svg.png\" width=\"512\"/>\n\nThe next obvious problem is exactly how to determine if each ray actually hits any objects in the scene. In typical ray tracing, this is done with defined intersection functions for each object: That function directly determines where a given ray will intersect some surface. To render objects with complex geometry, you often have to break those objects down into smaller building blocks for which you already know an intersection function. The problem is, this can be quite slow.\n\nLuckily, an alternative exists. In ray marching, there's no need to have an intersection function. Instead, we can use something called a Signed Distance Field, or SDF. This, instead of directly telling us if a given ray will intersect an object, simply tells us how far the ray is from the closest point of that object. From there, we can use the following algorithm:\n\n- Find how far a ray is from the nearest object\n- Move the ray forwards by that distance, as we know that that's the farthest it can go without having a chance of hitting anything\n- If the new minimum distance is below some low threshold, the ray has probably hit some object. Otherwise, repeat this sequence of steps until it does hit something.\n\n<img src=\"https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Visualization_of_SDF_ray_marching_algorithm.png/2560px-Visualization_of_SDF_ray_marching_algorithm.png\" width=\"512\"/>\n\nThen, once we've hit an object, we should cast a ray at each light source. If the ray hits some object on its way to a light source, then it should be a shadow. Otherwise, it's illuminated.\n\nWe can then do a few more calculations to determine exactly how dark it should be shaded, and then finally we draw it to the screen.\n\nWith the basic algorithm planned, let's start writing code.\n\nFirst, initialize a turtle:\n`const t = new Turtle()`\n\n### Then, let's start defining some objects.\n\nA Vec3, or 3 dimensional [vector](<https://en.wikipedia.org/wiki/Vector_(mathematics_and_physics)>), is a mathmatical object with some position. You can think of it as a set of 3 numbers, pointing to some location in space. They're a fundimental object in linear algebra, a mathematical subject used heavily in 3D graphics. For a good introduction to linear algebra, watch the first few episodes of [Essence of Linear Algebra](https://www.youtube.com/watch?v=fNk_zzaMoSs&list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab) by 3Blue1Brown.\n\nThere are a few basic functions we'll want to use with vectors:\n\n- Vectors can be added and subtracted, which corresponds to adding and subtracting each of their components.\n\n- We'll also want to find the distance between 2 vectors. This is done with a 3D generalization of the [Pythagorian Theorem.](https://en.wikipedia.org/wiki/Pythagorean_theorem) You can think of this as finding the hypotenuse of a triangle where the position of each vector corresponds to a vertex.\n- Vectors can be scaled by [scalars](<https://en.wikipedia.org/wiki/Scalar_(mathematics)>), which are essentially just ordinary numbers. This is done by multiplying each component of the vector by the scalar, effectively expanding or shrinking it.\n- We also need to know how large a vector is. This is done by just finding the distance between the vector and the point 0, 0, 0.\n- When a vector is normalized, we're scaling it down or up to be a [Unit Vector.](https://en.wikipedia.org/wiki/Unit_vector) We do this when we only care about the direction of a vector, not how large it is. This is done by dividing it by its size.\n- Lastly, we'll want a way to compute the [Dot Product](https://en.wikipedia.org/wiki/Dot_product) of two vectors. This is an operation that takes in 2 vectors and returns a scalar corresponding to how parallel they are. If two vectors are perpendicular, the dot product is zero. If they're parallel, the dot product is 1. This is done by multiplying each of the components of one vector by each component of another, and then adding the results together.\n\nIn code, that class looks like this:\n\n```js\n class Vec3 {\n    constructor(x, y, z) {\n        this.x = x\n        this.y = y\n        this.z = z\n    }\n    add(other) {\n        return new Vec3(other.x + this.x, other.y + this.y, other.z + this.z)\n    }\n    subtract(other) {\n        return new Vec3(this.x - other.x, this.y - other.y, this.z - other.z)\n    }\n    dist(other) {\n        return Math.sqrt((other.x - this.x)**2 + (other.y - this.y)**2 + (other.z - this.z)**2)\n    }\n    scale(scalar) {\n        return new Vec3(this.x * scalar, this.y * scalar, this.z * scalar)\n    }\n    magnitude() {\n        return this.dist(new Vec3(0, 0, 0))\n    }\n    normalized() {\n      return this.scale(1/this.magnitude())\n    }\n    dot(other) {\n      return (this.x * other.x + this.y * other.y + this.z * other.z)\n    }\n}\n```\n\nGreat! Now we can get to defining the physical objects in the scene. Each one should hold a position, an SDF, and optionally other attributes like size.\n\nA sphere is simple:\n\nThe SDF is just the distance between a given point and the center, minus the radius.\n\n```js\nclass Sphere {\n    constructor(pos, radius) {\n        this.pos = pos\n        this.radius = radius\n    }\n    SDF(pos) {\n        return (pos.dist(this.pos) - this.radius)\n    }\n}\n```\n\nVisually, in 2D, the Signed Distance Field looks like this:\n\n<img src=\"https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fshaderfun.files.wordpress.com%2F2018%2F03%2Fcirclewithdistances.png%3Fw%3D636&f=1&nofb=1&ipt=d185737f54167c01ed257f47d0f229de70340ec2cc42b040b107f0f6c668de1b&ipo=images\" width=\"512\"/>\n\nNext, here's a cube:\n\n```js\nclass Cube {\n    constructor(pos, size) {\n        this.pos = pos\n        this.size = size\n    }\n    SDF(pos) {\n        return Math.max(Math.abs(pos.x - this.pos.x), Math.abs(pos.y - this.pos.y), Math.abs(pos.z - this.pos.z)) - this.size\n    }\n}\n```\n\nThe cube SDF simply finds the distance between the cube and a given position in the x, y, and z direction, and takes the maximum. Lastly, we subtract the size. This is quite similar to the SDF of a sphere, but instead of computing the distance in 3D with the Pythagorean Theorem, we compute the 1-dimensional distance 3 times.\n\nNext, let's define planes. The only important attribute these have is a y value, as they extend infinitely in every direction. The SDF is also very simple, as it's just the vertical distance between a given point and the plane.\n\n```js\nclass Plane {\n    constructor(pos) {\n        this.pos = pos\n    }\n    SDF(pos) {\n        return pos.y - this.pos.y\n    }\n}\n```\n\nIf you want, you can define more complex objects too. For example, here's a sphere distorted by [noise](https://en.wikipedia.org/wiki/Gradient_noise). It's identical to a sphere, except for the fact that we randomly disturb the SDF with the Haxidraw editor's built-in fractal noise function. We'll also want to offset the noise sample by some constants, to make it asymmetrical.\n\n```js\nclass NoisySphere {\n    constructor(pos, radius, noiseScale, noiseAmp) {\n        this.pos = pos\n        this.radius = radius\n        this.noiseScale = noiseScale\n        this.noiseAmp = noiseAmp\n    }\n    SDF(pos) {\n        return (pos.dist(this.pos) - this.radius) + this.noiseAmp * noise([pos.x * this.noiseScale + 10, pos.y * this.noiseScale - 7, pos.z * this.noiseScale + 2])\n    }\n}\n```\n\nThose are all the primitive objects we need. From there, we can start defining the other classes, like `LightSource`.\n\nAll a light source needs is a position, and radius.\n\n```js\nclass LightSource {\n    constructor(pos, size) {\n        this.pos = pos\n        this.size = size\n    }\n}\n```\n\nTo hold all these things, we can store them in a world object:\n\n```js\nclass World {\n    constructor (objects, lightsources) {\n        this.objects = objects\n        this.lightsources = lightsources\n    }\n}\n```\n\nThe ray is the most important object in raymarching. It's going to hold the logic for marching forwards, and determining if it hits anything.\n\nFirst, give it a position and direction. These will both be of the class Vec3, as they'll point to a location in 3D space.\n\n```js\nclass Ray {\n    constructor (pos, dir) {\n        this.pos = pos\n        this.dir = dir\n    }\n```\n\nThe travel function will move the ray along its direction by a given distance. We do this by adding its direction to its position, scaled by the distance we want to travel.\n\n```js\n    travel(dist) {\n        this.pos = this.pos.add(this.dir.scale(dist))\n    }\n```\n\nNow, for the cast function. First, take in a camera (we'll define cameras later), and the objects the ray can collide with.\n\n```js\n    cast(objects, camera) {\n```\n\nThen, we'll need some variables. The `closestDist` records the distance to the nearest object we've found so far. We can set this to infinity when we first start out.\n\n```js\n        let closestDist = Infinity\n```\n\nThe `minDist` stores exactly how close a ray should be to an object before we count it as being a hit. Likewise, the `maxDist` is how far the ray can be from the camera before we give up on marching it.\n\n```js\n        let minDist = 0.01\n        let maxDist = camera.clipDist\n```\n\nThe `hitObj` is the current closest object we've found. It's null to start, because we haven't found any objects yet.\n\n```js\n        let hitObj = null\n```\n\nHere's the main loop. As long as the ray hasn't yet collided with anything, and is within range of the camera, we'll check for collisions. We do this by iterating through each object, and using its SDF to find how far away we are. If the current object is the new closest one found, we set it to be our hit object. Then, we travel forward by the closest distance found in the last step.\n\n```js\n        while ((closestDist > minDist) && (this.pos.dist(camera.pos) < maxDist)) {\n            closestDist = Infinity\n            for (let obj in objects) {\n                let dist = objects[obj].SDF(this.pos)\n                if (dist < closestDist) {\n                    closestDist = dist\n                    hitObj = objects[obj]\n                }\n            }\n            this.travel(closestDist)\n\n        }\n```\n\nAt the end, we'll return all the important information:\n\n- If we hit something\n- What we hit\n- Where we hit it\n\n```js\n        return [closestDist < minDist, hitObj, this.pos]\n    }\n```\n\nThe next function is almost identical to the first. The difference is that here, we're not just looking for hits with any object - we're seeing if it hits a specific one. The point of this function is to check for collisions with light sources, so that we can determine if a given point is in shadow. We also move forwards by a small distance to start with, so that we don't collide with our start object.\n\nThe ray marches along, returning false if it collides with something other than the target, and returning true if it's close enough to the target.\n\n```js\n    getTarget(target, objects, camera) {\n        let closestDist = Infinity\n        let minDist = 0.05\n        let maxDist = 80\n        let hitObj = null\n        this.travel(0.01)\n        while ((closestDist > minDist) && (this.pos.dist(camera.pos) < maxDist)) {\n            for (let obj in objects) {\n                let dist = objects[obj].SDF(this.pos)\n                if (dist < closestDist) {\n                    closestDist = dist\n                    hitObj = objects[obj]\n                }\n            }\n            let dist = target.dist(this.pos)\n                if (dist < 0.1) {\n                    return true\n                }\n            this.travel(0.05 * closestDist)\n\n        }\n        return false\n    }\n}\n```\n\n### There's one more utility function we'll want:\n\nTo shade objects later, we're going to need a way to find their [normal vectors](<https://en.wikipedia.org/wiki/Normal_(geometry)>). A normal is a vector pointing directly away from some surface.\n<img src=\"https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Surface_normals.svg/1920px-Surface_normals.svg.png\" width=\"512\"/>\n\nBecause we already know the SDF of a given object, this is actually quite easy. The normal is simply an arrow pointing along the gradient of our signed distance field.\n\nTo imagine this, take the diagram below, and reverse the direction of the arrows. Each arrow points in the direction of the SDF gradient. Each arrow is effectively the normal vector to that point in 3D space, relative to the SDF.\n<img src=\"https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Gradient2.svg/2560px-Gradient2.svg.png\" width=\"512\"/>To find these arrows, we'll just need to determine the local \"slope\" of the SDF - if you know calculus, we're basically taking the derivative in 3D. We'll determine how the SDF changes in response to a really small nudge in the x, y, and z directions. We then subtract that from the SDF at our start position, giving us the rate of change in each direction. Finally, we normalize this, to get the normal vector.\n\n```js\nfunction computeNormal(pos, obj) {\n  let startSDF = obj.SDF(pos)\n  return new Vec3(\n    obj.SDF(pos.add(new Vec3(0.001, 0, 0))) - startSDF,\n    obj.SDF(pos.add(new Vec3(0, 0.001, 0))) - startSDF,\n    obj.SDF(pos.add(new Vec3(0, 0, 0.001))) - startSDF\n  ).normalized()\n}\n```\n\n### Next, let's define the camera.\n\nThe camera should first obviously have a position. Next, a field-of-view value. Lastly, a clip distance, to determine how far it can see.\n\n```js\nclass Camera {\n    constructor(pos, fov, clipDist) {\n        this.pos = pos\n        this.fov = fov\n        this.clipDist = clipDist\n    }\n```\n\nIt aalso needs to have a `getRay` function, responsible for actually casting a ray. It points a ray at a given x and y, then shoots it in that direction.\n\nThis is the function that enables the camera to \"look\" in the direction of a given pixel.\n\nConceptually, you can think of it like this:\n\n- For a given pixel, match it to a point in 3D space. The x and y of the pixel in the screen will correspond to a physical x and y point on a plane in front of the camera. We then cast the ray in that direction, and render it to the screen depending on what it hits:\n\n<img src=\"https://upload.wikimedia.org/wikipedia/commons/b/b2/RaysViewportSchema.png\" width=\"512\"/>\n\nHere's it in code:\n\n```js\n    getRay(x, y, world) {\n      let ray = new Ray(this.pos, new Vec3(x, y, this.fov))\n      return ray.cast(world.objects, this)\n    }\n```\n\nNext, the `getShadow` function. This takes a point in 3D space, and shoots it at every light source, one at a time. To get realistically blurred shadows, we can aim at a random point within the bounds of the light source, instead of its exact center.\n\n```js\n    getShadow(pos, world) {\n      for (let i in world.lightSources) {\n        let size = world.lightSources[i].size\n        let randOffset = new Vec3(Math.random() * size, Math.random() * size, Math.random() * size)\n        let diff = world.lightSources[i].pos.add(randOffset).subtract(pos)\n        let ray = new Ray(pos, diff)\n```\n\nHere's where we actually use `getTarget`. We start by pointing the ray at the light source, plus a random offset within the volume of the light source. Then, we check if it ever reaches that source. If it's a hit, break the loop and return true, otherwise keep iterating through light sources. At the end, if none have been found, return false.\n\n```js\n        if (ray.getTarget(world.lightSources[i].pos.add(randOffset), world.objects, this)) return true\n      }\n      return false\n    }\n}\n```\n\nAnd that's the camera object!\n\n### So, how do we draw this to the screen?\n\nThis whole time, we haven't done much Haxidraw-specific code at all. To actually draw the output, we'll need a way of representing a pixel as a turtle path. To do this, we can use a process called [dithering.](https://en.wikipedia.org/wiki/Dither) Let's take a closer look at the original image, to see how this is used:\n\n<img src=\"https://cloud-5v54vbcnl-hack-club-bot.vercel.app/0image.png\" width=\"512\"/>\n\nEach \"_pixel_\" is just a set of lines. Darker pixels have 2 lines, and white pixels have none. Zooming out far enough, this gives the illusion of smooth gradients.\n\nBecause we only have 3 possible discrete brightness levels, we have to use some randomness to give the illusion of a wider range of colors from farther away. For example, although there appear to be various shades of grey in the below image, each pixel is actually only black or white. The value is determined probabilistically, where pixels that should be shaded darker have a higher probability of being black.\n\n<img src=\"https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fgraphicsacademy.com%2Fi1_davidrandom.png&f=1&nofb=1&ipt=a8b0442647a81cc1726e4b948d9004fadeb10fdd0a9e9eb7de79befd8b83da28&ipo=images\" width=\"512\"/>\n\nHere's what that looks like in the code:\n\n- We go to the x and y values of the pixel.\n- If the brightness is lower than a random value, draw a forward slash.\n- If it's below another lower threshold, draw a backslash.\n\n```js\nfunction drawPixel(x, y, w, h, brightness) {\n  t.up()\n  t.goto([x, y])\n  t.down()\n  if (brightness < Math.random()) {\n    t.goto([x + w, y + h])\n    t.goto([x, y])\n    if (brightness < Math.random() * 0.5) {\n      t.goto([x + w, y])\n      t.goto([x, y + h])\n      t.goto([x + w, y + h])\n      t.goto([x, y])\n    }\n  }\n}\n```\n\n### We're ready to build our main render function!\n\nWe can define the screen dimensions:\n\n```js\nconst screenWidth = 3\nconst screenHeight = 2\n```\n\nAnd then the pixel size: (Tweak this whenever you want, to change the detail of the image! Lower numbers render slower.)\n\n```js\nconst dx = 0.005\nconst dy = 0.005\n```\n\n```js\nfunction renderFrame(camera) {\n  for (let y = -screenHeight/2; y < screenHeight/2; y+= dy) {\n    for (let x = -screenWidth/2; x < screenHeight/2; x+= dx) {\n```\n\nAt each point, we'll get the corrosponding ray at that pixel:\n\n```js\n      let [hit, hitObj, rayPos] = camera.getRay(x, y, world)\n      if (hit) {\n```\n\nIf we're hit something, we'll check if there's a shadow at that hit location:\n\n```js\n        let noShadow = camera.getShadow(rayPos, world)\n        let brightness = 0;\n        if (noShadow) {\n```\n\nIf there was a shadow, we can leave the brightness at zero - no light is hitting it. _(In real life, there's diffuse ambient lighting, but we're not accounting for that)_. If there wasn't a shadow, that doesn't mean the pixel should be 100% bright, though.\n\nIf the vector from the light to the hit point and the normal of the surface are parallel, then the hit point is very directly illuminated. On the other hand, if the two vectors are perpendicular, then we shouldn't shade the point very brightly. We can use the dot product to determine exactly how parallel or perpendicular these vectors actually are.\n\n<img src=\"https://cloud-prkn4o0zj-hack-club-bot.vercel.app/0untitled_1_.png\" width=\"512\"/>\n\n```js\n          let norm = (computeNormal(rayPos, hitObj))\n```\n\nIterate through light sources, adding the brightness from each. The brightness is the normalized dot product between the normal and a vector pointing from the light source to the ray position:\n\n```js\n          for (let i in world.lightSources) {\n          brightness += norm.dot(\n            world.lightSources[i].pos.subtract(rayPos).normalized()\n          )\n          }\n```\n\nAverage them out at the end:\n\n```js\n          brightness /= world.lightSources.length\n        }\n```\n\nDraw a pixel with that brightness. If we didn't hit something with the ray at the start, we just skip drawing anything.\n\n```js\n        drawPixel(x, y, dx, dy, brightness)\n      } else {\n        t.up()\n        t.goto([x, y])\n      }\n    }\n```\n\nGo back to the left to render the next line:\n\n```js\n    t.up()\n    t.goto([-3, 0])\n    t.down()\n  }\n}\n```\n\nAnd now, finally, we can create a world, and render it! Here, we initialize our camera, light sources, and objects. The parameters are arbitrary, and you can shift them around or add different objects to create any scene you want.\n\n```js\nconst cam = new Camera(new Vec3(0, 0, 0), 1.0, 20)\nconst world = new World()\nworld.lightSources = [new LightSource(new Vec3(20, 10, -5), 5)]\n world.objects = [\n  new Cube(new Vec3(-2.09, -2, 9.2), 1),\n  new Cube(new Vec3(-4.9, -2, 6.3), 1),\n  new Cube(new Vec3(1.2, -2, 7.2), 1),\n  new Plane(new Vec3(0, -3, 0))\n ]\nrenderFrame(cam)\ndrawTurtles(t)\n```\n\nGreat job! If all went well, you should have a working 3D renderer for the Haxidraw. It's capable of rendering any shape with a defined SDF, so there are plenty of possibilities to explore. Here are a few scenes I've created with the engine:\n\n<img src=\"https://cloud-8vr3j0wiq-hack-club-bot.vercel.app/0image.png\" width=\"512\"/>\n<img src=\"https://cloud-5ewdcrd1t-hack-club-bot.vercel.app/0image.png\" width=\"512\"/>\n\nThe result of an interesting graphical glitch:\n\n<img src=\"https://cloud-hx649z5vl-hack-club-bot.vercel.app/0image.png\" width=\"512\"/>\n\nAnd there are plenty more possibilities! In fact, the engine as provided in this guide is quite minimal, and there are plenty of changes that can be made to make it more advanced. Here are a few ideas:\n\n- Add reflections: This can be done by casting another ray from the hit position into the surroundings, and adding the color of the object it hits to the original object.\n\n- Diffuse lighting: This can be done similarly to reflections, by casting many rays randomly from the original ray's hit position, and letting them scatter around the environment. Then, add the average color back to the original object.\n\n- Depth of field: When shooting rays from the camera, first make them pass through a focal point, offset randomly. This should give an adjustable depth-blur effect.\n\n- Try rendering more objects! Plenty of complex shapes have simple SDFs, for example, the amazing [Mandelbulb](https://en.wikipedia.org/wiki/Mandelbulb).\n";
const data = { title: "Raymarching", description: "The goal of this guide will be to simulate 3D environments, with realistic lighting and shadows. By the end, you should have something like this...\n", thumbnail: "https://cloud-4kaqtq8oi-hack-club-bot.vercel.app/0image.png" };
const _internal = {
  type: "content",
  filePath: "/Users/jchen/Documents/Programming/prs/haxidraw/astro/src/content/workshops/raymarching.md",
  rawData: "\ntitle: Raymarching\ndescription: >\n    The goal of this guide will be to simulate 3D environments, with realistic lighting and shadows. By the end, you should have something like this...\nthumbnail: https://cloud-4kaqtq8oi-hack-club-bot.vercel.app/0image.png"
};
export {
  _internal,
  body,
  collection,
  data,
  id,
  slug
};
