package com.labourlink.labourlinkai.service;

import com.labourlink.labourlinkai.entity.Labour;
import java.util.List;

public interface LabourService {

    Labour createLabour(Labour labour);

    List<Labour> getAllLabours();

    Labour getLabourById(Long id);

    Labour updateLabour(Long id, Labour labour);

    void deleteLabour(Long id);

    List<Labour> filterBySkill(String skill);

    List<Labour> filterByLocation(String location);

    List<Labour> searchAndRankLabours(String skill, String location);
}