#version 330 core
layout(location = 0) in vec3 aPosition;
layout(location = 1) in mat4 aInstanceMatrix;
flat out int visible;

struct BoundingBox {
    vec3 min;
    vec3 max;
};

struct Plane {
    vec3 normal;
    float signedDistance;
};

struct Frustum {
    Plane planes[6];
};

uniform BoundingBox boundingBox;
uniform Frustum frustum;

// TODO: Modify the following code to achieve GPU frustum culling
void main() {
    // ����Χ�б任������ռ�
    vec3 locals[8];
    locals[0] = boundingBox.min;
    locals[1] = vec3(boundingBox.min.x, boundingBox.min.y, boundingBox.max.z);
    locals[2] = vec3(boundingBox.min.x, boundingBox.max.y, boundingBox.min.z);
    locals[3] = vec3(boundingBox.min.x, boundingBox.max.y, boundingBox.max.z);
    locals[4] = vec3(boundingBox.max.x, boundingBox.min.y, boundingBox.min.z);
    locals[5] = vec3(boundingBox.max.x, boundingBox.min.y, boundingBox.max.z);
    locals[6] = vec3(boundingBox.max.x, boundingBox.max.y, boundingBox.min.z);
    locals[7] = boundingBox.max;
    vec3 worlds[8];
    for (int i = 0; i < 8; i++)
    {
        worlds[i] = (aInstanceMatrix * vec4(locals[i], 1.0)).xyz;
    }

    // ��������ռ��µ���Сֵ�����ֵ
    vec3 worldMin = worlds[0];
    vec3 worldMax = worlds[0];
    for (int i = 1; i < 8; i++)
    {
        worldMin = min(worldMin, worlds[i]);
        worldMax = max(worldMax, worlds[i]);
    }

    vec3 center = (worldMin + worldMax) * 0.5;
    vec3 extents = worldMax - center;

    // �����޳�����
    visible = 1;
    for (int i = 0; i < 6; i++) {
        Plane plane = frustum.planes[i];
        float r = dot(extents, abs(plane.normal));
        float distance = dot(plane.normal, center) + plane.signedDistance;

        // �����Χ����ȫ��ĳ��ƽ�����࣬���޳�
        if (-r > distance) {
            visible = 0;
            break;
        }
    }
}