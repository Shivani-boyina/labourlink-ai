package com.labourlink.labourlinkai.response;

import com.labourlink.labourlinkai.entity.Contractor;

public class ContractorResponse {

    private Long contractorId;
    private String contractorName;
    private String companyName;
    private String phone;
    private String location;
    private String state;
    private String district;

    public ContractorResponse() {
    }

    public ContractorResponse(Contractor contractor) {
        this.contractorId = contractor.getContractorId();
        this.contractorName = contractor.getContractorName();
        this.companyName = contractor.getCompanyName();
        this.phone = contractor.getPhone();
        this.location = contractor.getLocation();
        this.state = contractor.getState();
        this.district = contractor.getDistrict();
    }

    public Long getContractorId() {
        return contractorId;
    }

    public void setContractorId(Long contractorId) {
        this.contractorId = contractorId;
    }

    public String getContractorName() {
        return contractorName;
    }

    public void setContractorName(String contractorName) {
        this.contractorName = contractorName;
    }

    public String getCompanyName() {
        return companyName;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getLocation() {
        return location;
    }

    public String getState() { return state; }
    public String getDistrict() { return district; }

    public void setLocation(String location) {
        this.location = location;
    }
}
