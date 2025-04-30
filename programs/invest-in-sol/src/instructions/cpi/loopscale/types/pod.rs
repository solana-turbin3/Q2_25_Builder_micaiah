// use anchor_lang::prelude::*;
// use anchor_lang::{AnchorDeserialize, AnchorSerialize};
// use bytemuck::{Pod, Zeroable};

// /// represents a bool stored as a byte for some god awful reason
// #[repr(transparent)]
// #[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Zeroable, Pod)]
// pub struct PodBool(u8);

// impl From<bool> for PodBool {
//     fn from(b: bool) -> Self {
//         PodBool(b as u8)
//     }
// }

// impl From<PodBool> for bool {
//     fn from(pb: PodBool) -> Self {
//         pb.0 != 0
//     }
// }

// /// represents a scaled decimal (scaled by 10^18)
// #[repr(C)]
// #[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Zeroable, Pod, Default, Debug, PartialEq)]
// pub struct PodDecimal([u8; 24]);

// /// represents a 128-bit unsigned integer stored as little endian bytes
// #[repr(C)]
// #[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Zeroable, Pod, Default, Debug, PartialEq)]
// pub struct PodU128([u8; 16]);

// impl From<u128> for PodU128 {
//     fn from(val: u128) -> Self {
//         PodU128(val.to_le_bytes())
//     }
// }

// impl From<PodU128> for u128 {
//     fn from(pod: PodU128) -> Self {
//         u128::from_le_bytes(pod.0)
//     }
// }

// /// represents a 16-bit unsigned integer stored as bytes (little-endian)
// #[repr(transparent)]
// #[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Zeroable, Pod, Default, Debug, PartialEq)]
// pub struct PodU16([u8; 2]);

// impl From<u16> for PodU16 {
//     fn from(val: u16) -> Self {
//         PodU16(val.to_le_bytes())
//     }
// }

// impl From<PodU16> for u16 {
//     fn from(pod: PodU16) -> Self {
//         u16::from_le_bytes(pod.0)
//     }
// }

// /// represents a 32-bit unsigned integer stored as bytes (little-endian)
// #[repr(transparent)]
// #[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Zeroable, Pod, Default, Debug, PartialEq)]
// pub struct PodU32([u8; 4]);

// impl From<u32> for PodU32 {
//     fn from(val: u32) -> Self {
//         PodU32(val.to_le_bytes())
//     }
// }

// impl From<PodU32> for u32 {
//     fn from(pod: PodU32) -> Self {
//         u32::from_le_bytes(pod.0)
//     }
// }

// /// Helper type to store u32 cbps values
// #[repr(C)]
// #[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Zeroable, Pod, Default, Debug, PartialEq)]
// pub struct PodU32CBPS([u8; 4]);

// impl From<u32> for PodU32CBPS {
//     fn from(val: u32) -> Self {
//         PodU32CBPS(val.to_le_bytes())
//     }
// }

// impl From<PodU32CBPS> for u32 {
//     fn from(pod: PodU32CBPS) -> Self {
//         u32::from_le_bytes(pod.0)
//     }
// }

// /// represents a 64-bit unsigned integer stored as bytes (little-endian)
// #[repr(transparent)]
// #[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Zeroable, Pod, Default, Debug, PartialEq)]
// pub struct PodU64([u8; 8]);

// impl From<u64> for PodU64 {
//     fn from(val: u64) -> Self {
//         PodU64(val.to_le_bytes())
//     }
// }

// impl From<PodU64> for u64 {
//     fn from(pod: PodU64) -> Self {
//         u64::from_le_bytes(pod.0)
//     }
// }

// /// Helper type to store u64 cbps values
// #[repr(C)]
// #[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Zeroable, Pod, Default, Debug, PartialEq)]
// pub struct PodU64CBPS([u8; 8]);

// impl From<u64> for PodU64CBPS {
//     fn from(val: u64) -> Self {
//         PodU64CBPS(val.to_le_bytes())
//     }
// }

// impl From<PodU64CBPS> for u64 {
//     fn from(pod: PodU64CBPS) -> Self {
//         u64::from_le_bytes(pod.0)
//     }
// } 