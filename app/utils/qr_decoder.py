import cv2


def decode_qr_codes(image_path: str) -> list[str]:
    """
    Decode all QR codes found in an image.

    Returns a list of decoded strings. If no QR codes found, returns [].
    """
    image = cv2.imread(image_path)
    if image is None:
        return []

    detector = cv2.QRCodeDetector()
    decoded_values = []

    try:
        retval, decoded_info, points, _ = detector.detectAndDecodeMulti(image)
        if retval and decoded_info:
            decoded_values.extend([info.strip() for info in decoded_info if info])
    except Exception:
        pass

    if not decoded_values:
        data, _, _ = detector.detectAndDecode(image)
        if data:
            decoded_values.append(data.strip())

    return decoded_values
