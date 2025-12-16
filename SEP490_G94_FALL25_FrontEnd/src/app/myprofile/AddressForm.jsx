"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";

/* -------------------- COMPONENT ADDRESS FORM -------------------- */
const AddressForm = ({ address, onChange }) => {
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);

  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedWard, setSelectedWard] = useState("");

  useEffect(() => {
    axios
      .get("https://provinces.open-api.vn/api/?depth=3")
      .then((res) => setProvinces(res.data))
      .catch((err) => console.error("Lỗi tải tỉnh/thành:", err));
  }, []);

  useEffect(() => {
    if (address.city && provinces.length > 0) {
      const p = provinces.find((x) => x.name === address.city);
      if (p) {
        setSelectedProvince(String(p.code));
        setDistricts(p.districts);

        const d = p.districts.find((x) => x.name === address.postalCode);
        if (d) {
          setSelectedDistrict(String(d.code));
          setWards(d.wards);

          const w = d.wards.find((x) => x.name === address.street);
          if (w) setSelectedWard(String(w.code));
        }
      }
    }
  }, [address, provinces]);

  const handleProvinceChange = (e) => {
    const code = e.target.value;
    setSelectedProvince(code);
    const selected = provinces.find((p) => p.code === Number(code));

    setDistricts(selected?.districts || []);
    setWards([]);
    setSelectedDistrict("");
    setSelectedWard("");

    onChange({
      ...address,
      city: selected?.name || "",
      postalCode: "",
      street: "",
      country: "Việt Nam",
    });
  };

  const handleDistrictChange = (e) => {
    const code = e.target.value;
    setSelectedDistrict(code);
    const selected = districts.find((d) => d.code === Number(code));

    setWards(selected?.wards || []);
    setSelectedWard("");

    onChange({
      ...address,
      postalCode: selected?.name || "",
      street: "",
      country: "Việt Nam",
    });
  };

  const handleWardChange = (e) => {
    const code = e.target.value;
    setSelectedWard(code);
    const selected = wards.find((w) => w.code === Number(code));

    onChange({
      ...address,
      street: selected?.name || "",
      country: "Việt Nam",
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div>
        <label className="font-semibold">Quốc Gia</label>
        <input
          type="text"
          value={address.country || "Việt Nam"}
          readOnly
          className="w-full border px-3 py-2 bg-gray-100 rounded-lg"
        />
      </div>

      <div>
        <label className="font-semibold">Tỉnh / Thành phố</label>
        <select
          value={selectedProvince}
          onChange={handleProvinceChange}
          className="w-full border px-3 py-2 rounded-lg"
        >
          <option value="">-- Chọn Tỉnh --</option>
          {provinces.map((p) => (
            <option key={p.code} value={p.code}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="font-semibold">Quận / Huyện</label>
        <select
          value={selectedDistrict}
          onChange={handleDistrictChange}
          disabled={!selectedProvince}
          className="w-full border px-3 py-2 rounded-lg disabled:bg-gray-100"
        >
          <option value="">-- Chọn Huyện --</option>
          {districts.map((d) => (
            <option key={d.code} value={d.code}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="font-semibold">Phường / Xã</label>
        <select
          value={selectedWard}
          onChange={handleWardChange}
          disabled={!selectedDistrict}
          className="w-full border px-3 py-2 rounded-lg disabled:bg-gray-100"
        >
          <option value="">-- Chọn Xã --</option>
          {wards.map((w) => (
            <option key={w.code} value={w.code}>
              {w.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};



export default AddressForm;
