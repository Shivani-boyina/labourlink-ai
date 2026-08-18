package com.labourlink.labourlinkai.controller;

import com.labourlink.labourlinkai.entity.Labour;
import com.labourlink.labourlinkai.service.LabourService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/labours")
public class LabourController {

    @Autowired
    private LabourService labourService;

    // CREATE
    @PostMapping
    public Labour saveLabour(@RequestBody Labour labour) {
        return labourService.createLabour(labour);
    }

    // READ ALL
    @GetMapping
    public List<Labour> getAllLabours() {
        return labourService.getAllLabours();
    }

    // UPDATE
    @PutMapping("/{id}")
    public Labour updateLabour(@PathVariable Long id,
                                @RequestBody Labour labour) {
        return labourService.updateLabour(id, labour);
    }

    // DELETE
    @DeleteMapping("/{id}")
    public String deleteLabour(@PathVariable Long id) {
        labourService.deleteLabour(id);
        return "Labour deleted successfully";
    }

    // SEARCH
    @GetMapping("/search")
    public List<Labour> searchLabours(
            @RequestParam(required = false) String skill,
            @RequestParam(required = false) String location) {

        return labourService.searchAndRankLabours(skill, location);
    }

    // FILTER BY SKILL
    @GetMapping("/filter/skill")
    public List<Labour> filterBySkill(@RequestParam String skill) {
        return labourService.filterBySkill(skill);
    }

    // FILTER BY LOCATION
    @GetMapping("/filter/location")
    public List<Labour> filterByLocation(@RequestParam String location) {
        return labourService.filterByLocation(location);
    }
}