export default `
#define M_PI 3.1415926535897932384626433832795
#define lightCount 4
precision highp float;

out vec4 outFragColor;

struct Material
{
  vec3 albedo;
  float roughness;
  float metallic;
};

struct PointLight  
{
  vec3 position; 
  vec3 color; 
  float intensity;
}; 

uniform Material uMaterial;
uniform vec3 viewPosition; 
uniform PointLight lights[lightCount];
uniform sampler2D diffuse_IBL; 
uniform sampler2D specular_IBL;

in vec3 vNormalWS;
in vec3 fragPosition; 

// From three.js
vec4 sRGBToLinear( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}

// From three.js
vec4 LinearTosRGB( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}

float Gschilck(float dotprod, float k) {
  return dotprod / (dotprod * (1.0 - k) + k);
}

float max_dot(vec3 a, vec3 b) {
  return max(dot(a, b), 0.000001);
}

vec3 pbr_color(vec3 viewDirection, vec3 lightDirection, float roughness, float metallic, vec3 albedo, vec3 normal) {
  // -- Specular --
  vec3 h = normalize(lightDirection + -viewDirection); 
  float rough2 = pow(roughness, 2.0);
  
  // Normal Diffusion Function
  float D = rough2 / (M_PI * pow(pow(max_dot(normal, h), 2.0) * (rough2 - 1.0) + 1.0, 2.0)); 
  
  // Fresnel
  vec3 f0 = vec3(0.04);//vec3(0.04);
  f0 = mix(f0, albedo, metallic);
  vec3 F = (f0 + (1.0 - f0) * pow(1.0 - min(max_dot(h, -viewDirection), 1.0), 5.0)) * vec3(1.0, 1.0, 1.0);
  
  // G
  float dotNV = max_dot(normal, -viewDirection);
  float dotNL = max_dot(normal, lightDirection);
  float kDirect = pow(roughness + 1.0, 2.0) / 8.0;
  float G = Gschilck(dotNV, kDirect) * Gschilck(dotNL, kDirect);


  float specular = (D * G) / (4.0 * dotNV * dotNL);

  // -- Diffuse -- 
  vec3 diffuse = albedo / M_PI;
  vec3 kD = (vec3(1.0) - F) * (1.0 - metallic);

  return (kD * diffuse + F * specular) * dotNL;
}

void main()
{
  vec3 normal = normalize(vNormalWS); 

  // **DO NOT** forget to do all your computation in linear space.
  vec3 albedo = sRGBToLinear(vec4(uMaterial.albedo, 1.0)).rgb;

  vec3 viewDirection = normalize(fragPosition - viewPosition); 

  vec3 radiance = vec3(0, 0, 0); 
  //int i = 3;
  for (int i = 0; i < lightCount; i++) {
    vec3 lightDirection = normalize(lights[i].position.xyz - fragPosition);
    float distanceLight = length(lights[i].position.xyz - fragPosition);
    float lightIntensity = lights[i].intensity / pow(distanceLight, 2.0);
    vec3 lightColor = lightIntensity * lights[i].color;

    vec3 color = pbr_color(viewDirection, lightDirection, max(uMaterial.roughness, 0.0), uMaterial.metallic, albedo, normal);
    radiance += color * lightColor;
  }

  // **DO NOT** forget to apply gamma correction as last step.
  outFragColor.rgba = LinearTosRGB(vec4(radiance, 1.0));
}
`;
