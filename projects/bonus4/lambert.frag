#version 330 core

in vec3 fPosition;
in vec3 fNormal;

out vec4 color;

struct Material {
    vec3 ka;
    vec3 kd;
};

struct AmbientLight {
    vec3 color;
    float intensity;
};

struct DirectionalLight {
    vec3 direction;
    float intensity;
    vec3 color;
};

struct PointLight {
    vec3 position;
    float intensity;
    vec3 color;
    float kc;
    float kl;
    float kq;
};

uniform mat4 view;
uniform vec3 viewPosition;

uniform Material material;

uniform AmbientLight ambientLight;
uniform DirectionalLight directionalLight;
uniform PointLight pointLight;

uniform mat4 directionalLightSpaceMatrix;
uniform int directionalFilterRadius;
uniform sampler2D depthTexture;

uniform float pointLightZfar;
uniform bool enableOmnidirectionalPCF;
uniform samplerCube depthCubeTexture;

uniform mat4 directionalLightSpaceMatrices[16];
uniform float cascadeZfars[16];
uniform float cascadeBiasModifiers[16];
uniform int cascadeCount;
uniform sampler2DArray depthTextureArray;

vec3 calcAmbientLight() {
    return ambientLight.color * ambientLight.intensity * material.ka;
}

vec3 calcDirectionalLight(vec3 normal) {
    vec3 lightDir = normalize(-directionalLight.direction);
    vec3 diffuse = directionalLight.color * max(dot(lightDir, normal), 0.0) * material.kd;
    return directionalLight.intensity * diffuse ;
}

vec3 calcPointLight(vec3 normal) {
    vec3 lightDir = normalize(pointLight.position - fPosition);
    vec3 diffuse = pointLight.color * max(dot(lightDir, normal), 0.0) * material.kd;
    float distance = length(pointLight.position - fPosition);
    float attenuation = 1.0 / (pointLight.kc + pointLight.kl * distance + pointLight.kq * distance * distance);
    return pointLight.intensity * attenuation * diffuse;
}

float calcDirectionalShadow(vec4 fragPosLightSpace, int cascadeIndex) {
    // �Ӳü��ռ�ת��������ռ�
    vec3 projCoords = fragPosLightSpace.xyz / fragPosLightSpace.w;
    projCoords = projCoords * 0.5 + 0.5;

    // ���ƬԪ�ڹ�Դ��׶���⣬��Ϊ����Ӱ
    if (projCoords.z > 1.0) {
        return 1.0;
    }

    // ȡ��Ӧ cascade �����ƫ��
    float bias = 0.005 * cascadeBiasModifiers[cascadeIndex];
    
    // �����������
    float shadowDepth = texture(depthTextureArray, vec3(projCoords.xy, cascadeIndex)).r;

    // �ж��Ƿ�����Ӱ��
    return projCoords.z - bias > shadowDepth ? 0.0 : 1.0;
}

float calcPointShadow(vec3 fragToLight) {
    float distance = length(fragToLight);
    float bias = 0.05;
    
    // ���������������ͼ
    float shadowDepth = texture(depthCubeTexture, fragToLight).r;

    // �ж��Ƿ�����Ӱ��
    return distance - bias > shadowDepth * pointLightZfar ? 0.0 : 1.0;
}

vec3 calcDirectionalLightWithShadow(vec3 normal, vec4 fragPosLightSpace, int cascadeIndex) {
    vec3 lightDir = normalize(-directionalLight.direction);
    vec3 diffuse = directionalLight.color * max(dot(lightDir, normal), 0.0) * material.kd;

    // �����Ӱ����
    float shadowMask = calcDirectionalShadow(fragPosLightSpace, cascadeIndex);

    return shadowMask * directionalLight.intensity * diffuse;
}

vec3 calcPointLightWithShadow(vec3 normal, vec3 fragToLight) {
    vec3 lightDir = normalize(fragToLight);
    vec3 diffuse = pointLight.color * max(dot(lightDir, normal), 0.0) * material.kd;

    float distance = length(fragToLight);
    float attenuation = 1.0 / (pointLight.kc + pointLight.kl * distance + pointLight.kq * distance * distance);

    // �����Ӱ����
    float shadowMask = calcPointShadow(fragToLight);

    return shadowMask * pointLight.intensity * attenuation * diffuse;
}

// TODO: modify the following code to support shadow masking
void main() {
    vec3 normal = normalize(fNormal);

    vec3 ambient = calcAmbientLight();
    // �������Ӱ
    vec4 fragPosLightSpace = directionalLightSpaceMatrices[0] * vec4(fPosition, 1.0);
    vec3 directionalDiffuse = calcDirectionalLightWithShadow(normal, fragPosLightSpace, 0);

    // �����Ӱ
    vec3 fragToLight = pointLight.position - fPosition;
    vec3 pointDiffuse = calcPointLightWithShadow(normal, fragToLight);

    color = vec4(ambient + directionalDiffuse + pointDiffuse, 1.0);
}