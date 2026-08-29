from typing import Any


def generate_analysis_summary(
    detections: list[dict[str, Any]],
    risk: dict[str, Any]
) -> str:

    if not detections:
        return "No objects were detected in the sonar image."

    object_names = [
        detection.get("class_name", "unknown")
        for detection in detections
    ]

    objects_text = ", ".join(object_names)

    return (
        f"Detected objects: {objects_text}. "
        f"Overall risk level: {risk['risk_level']}."
    )
